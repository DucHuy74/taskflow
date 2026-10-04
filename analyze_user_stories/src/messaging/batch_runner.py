import pika
import json
import logging
import uuid
from datetime import datetime, timezone

from src.database.db import db_manager
from src.database.db_slave import get_slave_db
from src.database.neo4j import Neo4jConnection

from src.services.graph_batch_service import GraphBatchService
from src.services.neo4j_write_lock import workspace_write_lock
from src.services.semantic_normalization_service import SemanticNormalizationService
from src.services.statistics_service import StatisticsService
from src.services.similarity_factory import build_similarity_calculator
from src.utils.model_loader import load_models
from src.services.neo4j_service import Neo4jService
from src.services.priority_service import PriorityService
from src.utils.structured_logging import configure_structured_logging

configure_structured_logging()
logger = logging.getLogger(__name__)

STATUS_ROUTING_KEY = "recommendation.job-status"
CANDIDATES_ROUTING_KEY = "recommendation.candidates"
CANDIDATE_CHUNK_SIZE = 50


def publish_event(channel, routing_key, event_type, payload):
    message = {
        "eventId": str(uuid.uuid4()),
        "type": event_type,
        "version": "v2",
        "occurredAt": datetime.now(timezone.utc).isoformat(),
        "jobId": payload.get("jobId"),
        "workspaceId": payload.get("workspaceId"),
        "payload": payload,
    }
    channel.basic_publish(
        exchange="userstory.exchange",
        routing_key=routing_key,
        body=json.dumps(message, separators=(",", ":")),
        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
    )

# LOAD MODEL 
nlp, word2Vec = load_models()
similarity_calculator = build_similarity_calculator(word2Vec)

semantic_service = SemanticNormalizationService(similarity_calculator)
statistics_service = StatisticsService()

neo4j_conn = Neo4jConnection()
neo4j_service = Neo4jService(neo4j_conn)


def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
    except Exception:
        logger.warning("Invalid rebuild event JSON", extra={"error_code": "INVALID_EVENT_JSON"})
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    logger.info("Rebuild event received", extra={"correlation_id": data.get("eventId")})

    event_type = data.get("type")
    version = data.get("version")
    payload = data.get("payload", {})
    job_id = payload.get("jobId")

    # validate type
    if event_type != "REBUILD_GRAPH":
        logger.info("Skipping non-rebuild event", extra={"correlation_id": data.get("eventId")})
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    workspace_id = payload.get("workspaceId")

    if not workspace_id:
        logger.warning("Missing workspaceId", extra={
            "correlation_id": data.get("eventId"),
            "job_id": job_id,
            "error_code": "MISSING_WORKSPACE_ID",
        })
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    analysis_db_gen = db_manager.get_session()
    analysis_db = next(analysis_db_gen)
    source_db_gen = get_slave_db()
    source_db = next(source_db_gen)

    try:
        if job_id:
            publish_event(ch, STATUS_ROUTING_KEY, "RECOMMENDATION_JOB_STATUS", {
                "jobId": job_id,
                "workspaceId": workspace_id,
                "status": "RUNNING",
                "stage": "LOADING",
                "progress": 5,
            })
        batch_service = GraphBatchService(
            semantic_service=semantic_service,
            statistics_service=statistics_service,
            neo4j_service=neo4j_service,
            db=analysis_db,
            source_db=source_db,
        )

        logger.info("Rebuilding workspace", extra={"job_id": job_id, "workspace_id": workspace_id})

        with workspace_write_lock.exclusive(workspace_id):
            def progress(stage, percent):
                if job_id:
                    publish_event(ch, STATUS_ROUTING_KEY, "RECOMMENDATION_JOB_STATUS", {
                        "jobId": job_id,
                        "workspaceId": workspace_id,
                        "status": "RUNNING",
                        "stage": stage,
                        "progress": percent,
                    })

            result = batch_service.rebuild_workspace(
                workspace_id,
                source_revision=payload.get("sourceRevision"),
                progress_callback=progress,
            )

        if job_id:
            candidates = result.get("candidates", [])
            chunk_count = (len(candidates) + CANDIDATE_CHUNK_SIZE - 1) // CANDIDATE_CHUNK_SIZE
            for chunk_index in range(chunk_count):
                start = chunk_index * CANDIDATE_CHUNK_SIZE
                publish_event(ch, CANDIDATES_ROUTING_KEY, "RECOMMENDATION_CANDIDATES", {
                    "jobId": job_id,
                    "workspaceId": workspace_id,
                    "sourceRevision": payload.get("sourceRevision"),
                    "chunkIndex": chunk_index,
                    "chunkCount": chunk_count,
                    "modelVersion": result.get("model_version"),
                    "policyVersion": result.get("policy_version"),
                    "candidates": candidates[start:start + CANDIDATE_CHUNK_SIZE],
                })
            publish_event(ch, STATUS_ROUTING_KEY, "RECOMMENDATION_JOB_STATUS", {
                "jobId": job_id,
                "workspaceId": workspace_id,
                "status": "SUCCEEDED",
                "stage": "PUBLISHING",
                "progress": 100,
                "candidateCount": result.get("candidate_count", 0),
                "chunkCount": chunk_count,
                "modelVersion": result.get("model_version"),
                "policyVersion": result.get("policy_version"),
            })

        logger.info("Workspace rebuild completed", extra={"job_id": job_id, "workspace_id": workspace_id})

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception:
        logger.exception("Workspace rebuild failed", extra={
            "job_id": job_id,
            "workspace_id": workspace_id,
            "error_code": "RECOMMENDATION_BATCH_FAILED",
        })

        if job_id:
            publish_event(ch, STATUS_ROUTING_KEY, "RECOMMENDATION_JOB_STATUS", {
                "jobId": job_id,
                "workspaceId": workspace_id,
                "status": "FAILED",
                "progress": 0,
                "errorCode": "RECOMMENDATION_BATCH_FAILED",
            })

        #  ko retry vô hạn
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    finally:
        source_db.close()
        source_db_gen.close()
        analysis_db.close()
        analysis_db_gen.close()



# RABBITMQ SETUP
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost')
)

channel = connection.channel()
channel.confirm_delivery()

#declare exchange
channel.exchange_declare(
    exchange='userstory.exchange',
    exchange_type='direct',
    durable=True
)

#declare queue
channel.queue_declare(
    queue='graph.rebuild.queue',
    durable=True
)

#bind queue với routing key
channel.queue_bind(
    exchange='userstory.exchange',
    queue='graph.rebuild.queue',
    routing_key='graph.rebuild'
)

#tránh nhận nhiều message cùng lúc
channel.basic_qos(prefetch_count=1)

#consume
channel.basic_consume(
    queue='graph.rebuild.queue',
    on_message_callback=callback,
    auto_ack=False
)

logger.info("Waiting for rebuild events")
channel.start_consuming()

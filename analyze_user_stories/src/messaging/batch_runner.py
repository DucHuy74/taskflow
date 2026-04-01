import pika
import json

from src.database.db import db_manager
from src.database.neo4j import Neo4jConnection

from src.services.graph_batch_service import GraphBatchService
from src.services.semantic_normalization_service import SemanticNormalizationService
from src.services.statistics_service import StatisticsService
from src.services.similarity_factory import build_similarity_calculator
from src.utils.model_loader import load_models
from src.services.neo4j_service import Neo4jService

# LOAD MODEL 
nlp, word2Vec = load_models()
similarity_calculator = build_similarity_calculator(word2Vec)

semantic_service = SemanticNormalizationService(similarity_calculator)
statistics_service = StatisticsService()

neo4j_conn = Neo4jConnection()
neo4j_service = Neo4jService(neo4j_conn)

# CALLBACK
def callback(ch, method, properties, body):
    try:
        data = json.loads(body)
    except Exception:
        print("[BATCH] Invalid JSON:", body)
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    print("\n[BATCH] Received:", data)
    print("[BATCH] Routing key:", method.routing_key)

    # FILTER EVENT
    if data.get("type") != "REBUILD_GRAPH":
        print("[BATCH] Skip non-rebuild event")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    workspace_id = data.get("workspaceId")

    if not workspace_id:
        print("[BATCH] Missing workspaceId")
        ch.basic_ack(delivery_tag=method.delivery_tag)
        return

    # DB SESSION
    db_gen = db_manager.get_session()
    db = next(db_gen)

    try:
        batch_service = GraphBatchService(
            semantic_service=semantic_service,
            statistics_service=statistics_service,
            neo4j_service=neo4j_service,
            db=db
        )

        print(f"[BATCH] Rebuilding workspace: {workspace_id}")

        batch_service.rebuild_workspace(workspace_id)

        print(f"[BATCH] Done workspace: {workspace_id}")

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print("[BATCH] Error:", e)

        #  retry lại
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    finally:
        db.close()
        db_gen.close()



# RABBITMQ SETUP
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost')
)

channel = connection.channel()

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

print("[BATCH] Waiting for rebuild events...")
channel.start_consuming()
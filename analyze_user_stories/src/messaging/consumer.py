import pika
import json

from src.database.db import db_manager
from src.database.db_slave import get_slave_db
from src.database.neo4j import Neo4jConnection

from src.services.analyze_parsing_service import AnalyzeParsingService
from src.services.semantic_normalization_service import SemanticNormalizationService
from src.services.statistics_service import StatisticsService
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.analyze_coordinator_service import AnalyzeCoordinatorService
from src.services.user_story_read_service import UserStoryReadService
from src.services.graph_building_service import GraphBuildingService
from src.services.neo4j_service import Neo4jService

from src.services.similarity_factory import build_similarity_calculator
from src.utils.model_loader import load_models


EXCHANGE = "userstory.exchange"

CREATED_QUEUE = "userstory.created.queue"
MOVED_QUEUE = "userstory.moved.queue"

CREATED_ROUTING_KEY = "userstory.created"
MOVED_ROUTING_KEY = "userstory.moved"


nlp, word2Vec = load_models()
similarity_calculator = build_similarity_calculator(word2Vec)

parser_service = AnalyzeParsingService(nlp, word2Vec)
knowledge_service = SemanticNormalizationService(similarity_calculator)
statistics_service = StatisticsService()

neo4j_conn = Neo4jConnection()
neo4j_service = Neo4jService(neo4j_conn)


def handle_story_created(data):
    db_write_gen = db_manager.get_session()
    db_slave_gen = get_slave_db()

    db_write = next(db_write_gen)
    db_slave = next(db_slave_gen)

    try:
        persistence = AnalyzePersistenceService(db_write)
        reader = UserStoryReadService(db_slave)

        graph_service = GraphBuildingService(
            knowledge_service,
            neo4j_service
        )

        coordinator = AnalyzeCoordinatorService(
            parser_service,
            knowledge_service,
            None,
            persistence
        )

        story_id = data.get("id")
        content = data.get("storyText")

        #VALIDATION KHÔNG THROW
        if not story_id:
            print("[WARN] Missing story_id → skip")
            return

        if not content:
            print("[WARN] Missing storyText → skip")
            return

        #idempotent
        if persistence.is_processed(story_id):
            print("[CREATE] Already processed")
            return

        result = coordinator.analyze_and_save(
            texts=[{
                "text": content,
                "user_story_id": story_id
            }],
            sprint_id=data.get("sprintId"),
            workspace_id=data.get("workspaceId"),
            creator_id=None
        )

        svo_list = result.get("svo_list", [])

        graph_service.process_realtime(
            svo_list=svo_list,
            workspace_id=data.get("workspaceId"),
            story_id=story_id,
            sprint_id=data.get("sprintId"),
            backlog_id=data.get("backlogId")
        )

        print(f"[CREATE] Done story_id={story_id}")

    finally:
        db_write.close()
        db_slave.close()
        db_write_gen.close()
        db_slave_gen.close()


def handle_story_moved(data):
    db_gen = db_manager.get_session()
    db = next(db_gen)

    try:
        persistence = AnalyzePersistenceService(db)

        story_id = data.get("id")

        if not story_id:
            print("[WARN] Missing story_id → skip")
            return

        persistence.update_context(
            story_id=story_id,
            sprint_id=data.get("sprintId"),
            backlog_id=data.get("backlogId")
        )

        neo4j_service.update_story_context(
            story_id=story_id,
            sprint_id=data.get("sprintId"),
            backlog_id=data.get("backlogId")
        )

        print(f"[MOVE] Updated story {story_id}")

    finally:
        db.close()
        db_gen.close()


def created_callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        print("\n[CREATED] Received:", data)

        payload = data.get("payload")
        if not payload:
            print("[CREATE ERROR]: Missing payload → skip")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        handle_story_created(payload)

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print("[CREATE ERROR]:", e)

        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def moved_callback(ch, method, properties, body):
    try:
        data = json.loads(body)
        print("\n[MOVED] Received:", data)

        payload = data.get("payload")
        if not payload:
            print("[MOVE ERROR]: Missing payload → skip")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        handle_story_moved(payload)

        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print("[MOVE ERROR]:", e)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)


def create_connection():
    credentials = pika.PlainCredentials("guest", "guest")

    params = pika.ConnectionParameters(
        host="localhost",
        port=5672,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )

    return pika.BlockingConnection(params)


def setup_rabbit(channel):
    # Exchange
    channel.exchange_declare(
        exchange=EXCHANGE,
        exchange_type='direct',
        durable=True
    )

    # CREATED
    channel.queue_declare(queue=CREATED_QUEUE, durable=True)
    channel.queue_bind(
        exchange=EXCHANGE,
        queue=CREATED_QUEUE,
        routing_key=CREATED_ROUTING_KEY
    )

    # MOVED
    channel.queue_declare(queue=MOVED_QUEUE, durable=True)
    channel.queue_bind(
        exchange=EXCHANGE,
        queue=MOVED_QUEUE,
        routing_key=MOVED_ROUTING_KEY
    )

    channel.basic_qos(prefetch_count=1)


def start_consumer():
    connection = create_connection()
    channel = connection.channel()

    setup_rabbit(channel)

    channel.basic_consume(
        queue=CREATED_QUEUE,
        on_message_callback=created_callback,
        auto_ack=False
    )

    channel.basic_consume(
        queue=MOVED_QUEUE,
        on_message_callback=moved_callback,
        auto_ack=False
    )

    print("Waiting for messages...")
    channel.start_consuming()


if __name__ == "__main__":
    start_consumer()
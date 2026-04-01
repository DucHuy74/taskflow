import pika
import json

from src.database.db import db_manager
from src.services.analyze_parsing_service import AnalyzeParsingService
from src.services.semantic_normalization_service import SemanticNormalizationService
from src.services.statistics_service import StatisticsService
from src.services.analyze_persistence_service import AnalyzePersistenceService
from src.services.analyze_coordinator_service import AnalyzeCoordinatorService
from src.utils.model_loader import load_models
from src.services.similarity_factory import build_similarity_calculator
from src.database.db_slave import get_slave_db
from src.services.user_story_read_service import UserStoryReadService
from src.services.graph_building_service import GraphBuildingService
from src.services.neo4j_service import Neo4jService
from src.database.neo4j import Neo4jConnection

# --- load model ---
nlp, word2Vec = load_models()
similarity_calculator = build_similarity_calculator(word2Vec)

parser_service = AnalyzeParsingService(nlp, word2Vec)
knowledge_service = SemanticNormalizationService(similarity_calculator)
statistics_service = StatisticsService()

neo4j_conn = Neo4jConnection()
neo4j_service = Neo4jService(neo4j_conn)


def callback(ch, method, properties, body):
    data = json.loads(body)
    print("Received message:", data)

    
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

        if not story_id:
            raise Exception("Missing story_id")

        # idempotent mới (check trong AnalyzeStoryResult)
        existing = persistence.is_processed(story_id)
        if existing:
            print("Already processed")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # Ưu tiên data từ MQ
        text = content

        # fallback nếu MQ không có data 
        # if not text:
        #     print("Fallback to SLAVE...")
        #     story = reader.get_story_by_id(story_id)
        #     if story:
        #         text = story.story_text

        if not text:
            raise Exception("No data to analyze")

        # analyze
        result = coordinator.analyze_and_save(
            texts=[{
                "text": text,
                "user_story_id": story_id
            }],
            sprint_id=data.get("sprintId"),
            workspace_id=data.get("workspaceId"),
            creator_id=None
        )

        # --- build graph realtime ---
        svo_list = result.get("svo_list", [])

        graph_service.process_realtime(
            svo_list=svo_list,
            workspace_id=data.get("workspaceId")
        )

        print("Analyze done")
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print("Error:", e)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    finally:
        db_write.close()
        db_slave.close()
        db_write_gen.close()
        db_slave_gen.close()


# --- connect RabbitMQ ---
connection = pika.BlockingConnection(
    pika.ConnectionParameters(host='localhost')
)

channel = connection.channel()

channel.queue_declare(
    queue='userstory.created.queue',
    durable=True
)

channel.basic_qos(prefetch_count=1)

channel.basic_consume(
    queue='userstory.created.queue',
    on_message_callback=callback,
    auto_ack=False
)

print("Waiting for messages...")
channel.start_consuming()
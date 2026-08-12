from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

load_dotenv()

class Neo4jConnection:

    def __init__(self):
        self.driver = GraphDatabase.driver(
            os.environ["NEO4J_URI"],
            auth=(
                os.environ["NEO4J_USERNAME"],
                os.environ["NEO4J_PASSWORD"]
            )
        )

    def close(self):
        self.driver.close()

    def execute(self, query, params=None):
        with self.driver.session() as session:
            return session.run(query, params or {})
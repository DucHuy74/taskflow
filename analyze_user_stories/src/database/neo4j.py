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
            result = session.run(query, params or {})
            return [record.data() for record in result]
        
    # =========================
    # DROP GRAPH
    # =========================
    def drop_graph(self, graph_name="workspace-graph"):
        query = """
        CALL gds.graph.drop($graph_name, false)
        """

        try:
            self.execute(query, {
                "graph_name": graph_name
            })
        except Exception:
            pass

    # =========================
    # PROJECT GRAPH
    # =========================
    def project_workspace_graph(
        self,
        workspace_id,
        graph_name="workspace-graph"
    ):

        self.drop_graph(graph_name)

        query = f"""
        CALL gds.graph.project.cypher(

            '{graph_name}',

            '
            MATCH (n)
            WHERE n.workspace_id = "{workspace_id}"
            RETURN id(n) AS id
            ',

            '
            MATCH (n)-[r]->(m)
            WHERE n.workspace_id = "{workspace_id}"
              AND m.workspace_id = "{workspace_id}"

            RETURN
                id(n) AS source,
                id(m) AS target
            '
        )
        """

        return self.execute(query)

    # =========================
    # DEGREE CENTRALITY
    # =========================
    def compute_degree(
        self,
        graph_name="workspace-graph"
    ):

        query = f"""
        CALL gds.degree.stream('{graph_name}')
        YIELD nodeId, score

        RETURN
            labels(gds.util.asNode(nodeId)) AS labels,
            gds.util.asNode(nodeId).name AS name,
            score

        ORDER BY score DESC
        """

        return self.execute(query)

    # =========================
    # BETWEENNESS CENTRALITY
    # =========================
    def compute_betweenness(
        self,
        graph_name="workspace-graph"
    ):

        query = f"""
        CALL gds.betweenness.stream('{graph_name}')
        YIELD nodeId, score

        RETURN
            labels(gds.util.asNode(nodeId)) AS labels,
            gds.util.asNode(nodeId).name AS name,
            score

        ORDER BY score DESC
        """

        return self.execute(query)
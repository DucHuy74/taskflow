from neo4j import GraphDatabase
from neo4j.exceptions import TransientError
import os
import time
from dotenv import load_dotenv

load_dotenv()


def _is_transient_error(exc: Exception) -> bool:
    if isinstance(exc, TransientError):
        return True
    message = str(exc).lower()
    return any(
        keyword in message
        for keyword in ("deadlock", "lock", "transient", "timeout", "unavailable")
    )


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

    def _run_with_retry(self, operation, max_retries: int = 3):
        delay = 0.1
        last_error = None

        for attempt in range(max_retries):
            try:
                with self.driver.session() as session:
                    return operation(session)
            except Exception as exc:
                last_error = exc
                if attempt == max_retries - 1 or not _is_transient_error(exc):
                    raise
                time.sleep(delay)
                delay *= 2

        raise last_error

    def execute(self, query, params=None):
        def operation(session):
            result = session.run(query, params or {})
            return [record.data() for record in result]

        return self._run_with_retry(operation)

    def execute_write(self, query, params=None):
        def operation(session):
            def work(tx):
                result = tx.run(query, params or {})
                return [record.data() for record in result]

            return session.execute_write(work)

        return self._run_with_retry(operation)

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

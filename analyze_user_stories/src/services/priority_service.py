import math
import numpy as np


class PriorityService:

    def __init__(self, neo4j_service, db):
        self.neo4j_service = neo4j_service
        self.db = db

    def compute_centrality(self, workspace_id):

        print(f"[PRIORITY] Computing centrality workspace={workspace_id}...")

        # =========================
        # DEGREE
        # =========================
        self.neo4j_service.run_query("""
        MATCH (n:Term {workspace_id: $ws})

        OPTIONAL MATCH (n)--(m:Term {workspace_id: $ws})

        WITH n, count(m) as deg

        SET n.degree = deg
        """, {
            "ws": workspace_id
        })

        # =========================
        # DROP OLD GRAPH
        # =========================
        try:
            self.neo4j_service.run_query("""
            CALL gds.graph.drop('termGraph', false)
            YIELD graphName
            """)
        except:
            pass

        try:

            # =========================
            # PROJECT GRAPH
            # =========================
            self.neo4j_service.run_query(f"""
            CALL gds.graph.project.cypher(

                'termGraph',

                '
                MATCH (n:Term)

                WHERE n.workspace_id = "{workspace_id}"

                RETURN id(n) AS id
                ',

                '
                MATCH (n:Term)-[r]->(m:Term)

                WHERE n.workspace_id = "{workspace_id}"
                AND m.workspace_id = "{workspace_id}"

                RETURN
                    id(n) AS source,
                    id(m) AS target
                '
            )
            YIELD graphName, nodeCount, relationshipCount

            RETURN graphName, nodeCount, relationshipCount
            """)

            # =========================
            # BETWEENNESS
            # =========================
            self.neo4j_service.run_query("""
            CALL gds.betweenness.write(
                'termGraph',
                {
                    writeProperty: 'betweenness'
                }
            )
            YIELD nodePropertiesWritten

            RETURN nodePropertiesWritten
            """)

            # =========================
            # NORMALIZE
            # =========================
            self.neo4j_service.run_query("""
            MATCH (n:Term {workspace_id: $ws})

            WITH max(n.betweenness) AS maxBet

            MATCH (m:Term {workspace_id: $ws})

            SET m.betweenness = CASE
                WHEN maxBet > 0
                THEN m.betweenness / maxBet
                ELSE 0.0
            END
            """, {
                "ws": workspace_id
            })

            # =========================
            # DROP GRAPH
            # =========================
            self.neo4j_service.run_query("""
            CALL gds.graph.drop('termGraph')
            YIELD graphName

            RETURN graphName
            """)

            print("[PRIORITY] GDS betweenness computed")

        except Exception as e:

            print(f"[PRIORITY] GDS failed: {e}")

            # fallback
            self.neo4j_service.run_query("""
            MATCH (n:Term {workspace_id: $ws})

            SET n.betweenness =
                coalesce(n.degree, 0) * 1.0
            """, {
                "ws": workspace_id
            })

        print("[PRIORITY] Centrality done")

    # LOAD STORY OBJECTS
    def load_story_objects(self, workspace_id):
        return self.neo4j_service.run_query("""
        MATCH (sub:Term {workspace_id: $ws})-[r:PERFORM]->(act:Term)
        WHERE r.story_id IS NOT NULL

        MATCH (act)-[:TARGET]->(obj:Term)

        RETURN 
            r.story_id as story_id, 
            collect(DISTINCT obj.name) as objects
        """, {"ws": workspace_id})

    # LOAD CACHE (scoped theo workspace — tránh trộn score giữa các workspace cùng tên term)
    def load_all_object_scores(self, workspace_id):
        result = self.neo4j_service.run_query("""
        MATCH (o:Term {workspace_id: $ws})
        RETURN o.name AS name,
               coalesce(o.degree, 0) AS degree,
               coalesce(o.betweenness, 0) AS betweenness
        """, {"ws": workspace_id})

        cache = {}
        for r in result:
            cache[(workspace_id, r["name"])] = (r["degree"], r["betweenness"])

        return cache

    # SCALING
    def compute_scaling(self, scores):
        values = [x[1] for x in scores]

        if not values:
            return 1, 0

        median = np.median(values)
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1

        if iqr == 0:
            return 1, -median

        alpha = 4 / iqr
        beta = -alpha * median

        return alpha, beta

    # SIGMOID
    def sigmoid(self, x):
        return 1 / (1 + math.exp(-x))

    # UPDATE
    def update_priority(self, story_id, priority):
        self.neo4j_service.run_query("""
        MERGE (s:UserStory {id: $id})
        SET s.priority = $priority
        """, {
            "id": story_id,
            "priority": priority
        })

    # MAIN
    def compute_priority_for_workspace(self, workspace_id):
        print(f"[PRIORITY] Start workspace={workspace_id}")

        # 1. centrality
        self.compute_centrality(workspace_id)

        # 2. load story objects
        stories = self.load_story_objects(workspace_id)

        if not stories:
            print("[PRIORITY] No stories found")
            return

        # 3. load cache (chỉ Term thuộc workspace hiện tại)
        object_cache = self.load_all_object_scores(workspace_id)

        struct_scores = []

        for s in stories:
            story_id = s["story_id"]
            objects = s["objects"]

            if not objects:
                struct_scores.append((story_id, 0))
                continue

            degree_sum = 0
            between_sum = 0

            for obj in objects:
                degree, between = object_cache.get((workspace_id, obj), (0, 0))
                degree_sum += degree
                between_sum += between

            degree_avg = degree_sum / len(objects)
            between_avg = between_sum / len(objects)

            x = 0.5 * degree_avg + 0.5 * between_avg

            struct_scores.append((story_id, x))

        # 4. scaling
        alpha, beta = self.compute_scaling(struct_scores)
        print(f"[PRIORITY] alpha={alpha}, beta={beta}")

        # 5. final priority
        for story_id, x in struct_scores:
            priority = self.sigmoid(alpha * x + beta)
            self.update_priority(story_id, priority)

        print("[PRIORITY] Done")
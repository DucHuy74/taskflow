import json


class Neo4jService:

    def __init__(self, conn):
        self.conn = conn

    # --- SVO ---
    def save_svo(
        self,
        svo_list,
        canonical_map,
        workspace_id,
        story_id=None,
        sprint_id=None,
        backlog_id=None,
        source="REALTIME"
    ):

        data = []

        for svo in svo_list:

            s = canonical_map.get(svo["subject"], svo["subject"])
            a = canonical_map.get(svo["action"], svo["action"])
            o = canonical_map.get(svo["object"], svo["object"])

            if not s or not a or not o:
                continue
            
            # Lấy story_id (ưu tiên từ svo, nếu không có thì lấy từ tham số truyền vào)
            current_story_id = svo.get("story_id") or story_id
            
            # Lấy priority từ svo nếu bên NLP của bạn có trích xuất
            priority = svo.get("priority") 

            data.append({
                "s": s,
                "a": a,
                "o": o,
                "story_id": current_story_id,
                "priority": priority
            })

        if not data:
            return

        query = """
        UNWIND $data AS row

        // TẠO CÁC NODE TERM
        MERGE (sub:Term {name: row.s, workspace_id: $ws})
        MERGE (act:Term {name: row.a, workspace_id: $ws})
        MERGE (obj:Term {name: row.o, workspace_id: $ws})

        // TẠO NODE USER STORY
        // Nếu dòng dữ liệu có story_id thì mới tạo node UserStory
        FOREACH (ignoreMe IN CASE WHEN row.story_id IS NOT NULL THEN [1] ELSE [] END |
            MERGE (story:UserStory {id: row.story_id})
            // Hàm coalesce: nếu row.priority bị null, nó sẽ giữ nguyên priority cũ trong DB 
            SET story.priority = coalesce(row.priority, story.priority) 
        )

        // TẠO MỐI QUAN HỆ PERFORM & TARGET
        MERGE (sub)-[r1:PERFORM {source: $source, story_id: row.story_id}]->(act)
        SET 
            r1.sprint_id = $sprintId,
            r1.backlog_id = $backlogId

        MERGE (act)-[r2:TARGET {source: $source, story_id: row.story_id}]->(obj)
        SET 
            r2.sprint_id = $sprintId,
            r2.backlog_id = $backlogId
        """

        self.conn.execute(query, {
            "data": data,
            "ws": workspace_id,
            "sprintId": sprint_id,
            "backlogId": backlog_id,
            "source": source
        })
        
    # --- Similarity ---
    def save_similarity(self, auto_merge, canonical_map, workspace_id):

        data = []

        for item in auto_merge:
            w1 = item["w1"]
            w2 = item["w2"]
            if not w1 or not w2 or w1 == w2:
                continue

            # Giữ tên gốc w1/w2: sau canonical_map hai verb có thể cùng root → bỏ qua cạnh nếu dùng canonical
            data.append({
                "c1": w1,
                "c2": w2,
                "sim": item["similarity"],
            })

        if not data:
            return

        query = """
        UNWIND $data AS row

        MERGE (a:Term {name: row.c1, workspace_id: $ws})
        MERGE (b:Term {name: row.c2, workspace_id: $ws})

        MERGE (a)-[r:SIMILAR {source: "BATCH"}]->(b)
        SET r.score = row.sim
        """

        self.conn.execute(query, {
            "data": data,
            "ws": workspace_id
        })
        
    # --- Association Rules ---
    def save_rules(self, rules, canonical_map, workspace_id):

        data = []

        for rule in rules:
            for a in rule["antecedents"]:
                for c in rule["consequents"]:

                    a_can = canonical_map.get(a, a)
                    c_can = canonical_map.get(c, c)

                    if not a_can or not c_can:
                        continue

                    data.append({
                        "a": a_can,
                        "c": c_can,
                        "conf": rule["confidence"],
                        "lift": rule["lift"]
                    })

        if not data:
            return

        query = """
        UNWIND $data AS row

        MERGE (a:Term {name: row.a, workspace_id: $ws})
        MERGE (c:Term {name: row.c, workspace_id: $ws})

        MERGE (a)-[r:ASSOCIATED {source: "BATCH"}]->(c)
        SET r.confidence = row.conf,
            r.lift = row.lift
        """

        self.conn.execute(query, {
            "data": data,
            "ws": workspace_id
        })
        
    
    def update_story_context(self, story_id, sprint_id, backlog_id):

        query = """
        MATCH ()-[r:PERFORM|TARGET]->()
        WHERE r.story_id = $storyId
        SET r.sprint_id = $sprintId,
            r.backlog_id = $backlogId
        """

        self.conn.execute(query, {
            "storyId": story_id,
            "sprintId": sprint_id,
            "backlogId": backlog_id
        })
        
    def clear_workspace(self, workspace_id):
        query = """
        MATCH (n {workspace_id: $ws})
        DETACH DELETE n
        """
        self.conn.execute(query, {"ws": workspace_id})

    def load_similarity_map(self, workspace_id):
        query = """
        MATCH (a:Term {workspace_id: $ws})
        OPTIONAL MATCH (a)-[r:SIMILAR]->(b:Term {workspace_id: $ws})
        WHERE b IS NOT NULL
        RETURN a.name AS left_term, b.name AS right_term, coalesce(r.score, 0.0) AS score
        """
        return self.conn.execute(query, {"ws": workspace_id})

    def load_rule_map(self, workspace_id):
        query = """
        MATCH (a:Term {workspace_id: $ws})-[r:ASSOCIATED]->(b:Term {workspace_id: $ws})
        RETURN a.name AS left_term,
               b.name AS right_term,
               coalesce(r.confidence, 0.0) AS confidence,
               coalesce(r.lift, 0.0) AS lift
        """
        return self.conn.execute(query, {"ws": workspace_id})

    def load_story_priorities(self, workspace_id):
        query = """
        MATCH (:Term {workspace_id: $ws})-[r:PERFORM]->(:Term {workspace_id: $ws})
        MATCH (s:UserStory {id: r.story_id})
        RETURN DISTINCT s.id AS story_id, coalesce(s.priority, 0.0) AS priority
        """
        return self.conn.execute(query, {"ws": workspace_id})

    def clear_redundancy_pairs(self, workspace_id):
        """Xóa cạnh REDUNDANT_WITH cũ của workspace trước khi ghi batch mới."""
        query = """
        MATCH (:UserStory)-[r:REDUNDANT_WITH {workspace_id: $ws}]->(:UserStory)
        DELETE r
        """
        self.conn.execute(query, {"ws": workspace_id})

    def save_redundancy_pairs(self, workspace_id, pairs):
        if not pairs:
            print(f"[NEO4J] REDUNDANT_WITH: nothing to save for workspace={workspace_id}")
            return 0

        query = """
        UNWIND $pairs AS row
        MERGE (a:UserStory {id: row.left_story_id})
        SET a.workspace_id = coalesce(a.workspace_id, $ws)
        MERGE (b:UserStory {id: row.right_story_id})
        SET b.workspace_id = coalesce(b.workspace_id, $ws)
        MERGE (a)-[r:REDUNDANT_WITH {workspace_id: $ws}]->(b)
        SET r.score = row.redundancy_prob,
            r.group_id = row.group_id,
            r.model = row.model_name,
            r.is_redundant = coalesce(row.is_redundant, false)
        RETURN count(r) AS written
        """
        rows = self.conn.execute(query, {"ws": workspace_id, "pairs": pairs})
        written = rows[0]["written"] if rows else len(pairs)
        print(f"[NEO4J] REDUNDANT_WITH saved: {written} edges workspace={workspace_id}")
        return written

    def count_redundancy_pairs(self, workspace_id):
        query = """
        MATCH (:UserStory)-[r:REDUNDANT_WITH {workspace_id: $ws}]->(:UserStory)
        RETURN count(r) AS total
        """
        rows = self.conn.execute(query, {"ws": workspace_id})
        return rows[0]["total"] if rows else 0

    def save_story_priority_v2(self, workspace_id, story_outputs):
        if not story_outputs:
            return

        query = """
        UNWIND $rows AS row
        MERGE (s:UserStory {id: row.story_id})
        SET s.priority_refined = row.priority_refined,
            s.redundancy_prob = row.redundancy_prob,
            s.priority_final = row.priority_final,
            s.redundancy_group_id = row.redundancy_group_id,
            s.workspace_id = coalesce(s.workspace_id, $ws)
        """
        self.conn.execute(query, {"ws": workspace_id, "rows": story_outputs})

    def save_classification_metrics(self, workspace_id, model_name, metrics):
        query = """
        MERGE (m:ClassificationMetrics {workspace_id: $ws})
        SET m.model_name = $model_name,
            m.metrics_json = $metrics_json
        """
        self.conn.execute(
            query,
            {
                "ws": workspace_id,
                "model_name": model_name,
                "metrics_json": json.dumps(metrics, ensure_ascii=True, separators=(",", ":")),
            },
        )

    def get_top_redundant_pairs(self, workspace_id, top_k=20):
        query = """
        MATCH (a:UserStory)-[r:REDUNDANT_WITH {workspace_id: $ws}]->(b:UserStory)
        RETURN a.id AS left_story_id,
               b.id AS right_story_id,
               coalesce(r.score, 0.0) AS redundancy_prob,
               coalesce(r.group_id, "group_0") AS group_id,
               coalesce(r.model, "unknown") AS model_name
        ORDER BY redundancy_prob DESC
        LIMIT $top_k
        """
        return self.conn.execute(query, {"ws": workspace_id, "top_k": top_k})
        
    def run_query(self, query, params=None):
        result = self.conn.execute(query, params or {})
        return list(result) 
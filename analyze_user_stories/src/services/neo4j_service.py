class Neo4jService:

    def __init__(self, conn):
        self.conn = conn

    # --- SVO ---
    def save_svo(self, svo_list, canonical_map, workspace_id):

        data = []

        for svo in svo_list:

            s = canonical_map.get(svo["subject"], svo["subject"])
            a = canonical_map.get(svo["action"], svo["action"])
            o = canonical_map.get(svo["object"], svo["object"])

            # tránh null node
            if not s or not a or not o:
                continue

            data.append({
                "s": s,
                "a": a,
                "o": o
            })

        if not data:
            return

        query = """
        UNWIND $data AS row

        MERGE (sub:Term {name: row.s, workspace_id: $ws})
        MERGE (act:Term {name: row.a, workspace_id: $ws})
        MERGE (obj:Term {name: row.o, workspace_id: $ws})

        MERGE (sub)-[:PERFORM]->(act)
        MERGE (act)-[:TARGET]->(obj)
        """

        self.conn.execute(query, {
            "data": data,
            "ws": workspace_id
        })
        
    # --- Similarity ---
    def save_similarity(self, auto_merge, canonical_map, workspace_id):

        data = []

        for item in auto_merge:

            c1 = canonical_map.get(item["w1"], item["w1"])
            c2 = canonical_map.get(item["w2"], item["w2"])

            # nếu cùng canonical thì bỏ luôn
            if c1 == c2:
                continue

            data.append({
                "c1": c1,
                "c2": c2,
                "sim": item["similarity"]
            })

        if not data:
            return

        query = """
        UNWIND $data AS row

        MERGE (a:Term {name: row.c1, workspace_id: $ws})
        MERGE (b:Term {name: row.c2, workspace_id: $ws})

        MERGE (a)-[r:SIMILAR]->(b)
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

        MERGE (a)-[r:ASSOCIATED]->(c)
        SET r.confidence = row.conf,
            r.lift = row.lift
        """

        self.conn.execute(query, {
            "data": data,
            "ws": workspace_id
        })
        
    
    def clear_workspace(self, workspace_id):
        query = """
        MATCH (n {workspace_id: $ws})
        DETACH DELETE n
        """
        self.conn.execute(query, {"ws": workspace_id})
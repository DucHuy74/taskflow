class KnowledgeLearningService:

    AUTO_MERGE_THRESHOLD = 0.85
    REVIEW_THRESHOLD = 0.5

    def __init__(self, similarity_calculator):
        self.similarity_calculator = similarity_calculator


    def process(self, svo_list):

        valid_svo, error_svo = self._split_svo(svo_list)

        similarity_results = self._compute_similarity(valid_svo)

        auto_merge, ambiguous = self._classify_similarity(similarity_results)

        canonical_map = self._build_canonical(auto_merge)

        frequency = self._analyze_frequency(valid_svo, canonical_map)

        return {
            "valid_svo": valid_svo,
            "error_svo": error_svo,
            "auto_merge": auto_merge,
            "ambiguous": ambiguous,
            "canonical_map": canonical_map,
            "frequency": frequency
        }


    def _split_svo(self, svo_list):

        valid = []
        error = []

        for item in svo_list:
            if item.get("status") == "VALID":
                valid.append(item)
            else:
                error.append(item)

        return valid, error


    def _compute_similarity(self, valid_svo):

        results = []

        for i in range(len(valid_svo)):
            for j in range(i + 1, len(valid_svo)):

                for key in ["action", "object"]:

                    w1 = valid_svo[i].get(key)
                    w2 = valid_svo[j].get(key)

                    if not w1 or not w2:
                        continue

                    w1 = w1.lower()
                    w2 = w2.lower()

                    if w1 == w2:
                        continue

                    sim = float(
                        self.similarity_calculator.calculate(
                            w1,
                            w2,
                            beta1=5.00,
                            beta2=1.30,
                            bias_b=-2.0
                        )
                    )


                    # ===== SAFETY AGAINST NONE =====
                    if sim is None:
                        continue

                    results.append({
                        "type": key,
                        "w1": w1,
                        "w2": w2,
                        "similarity": float(sim)
                    })

        return results


    def _classify_similarity(self, similarity_results):

        auto_merge = []
        ambiguous = []

        for item in similarity_results:

            sim = item["similarity"]

            if sim >= self.AUTO_MERGE_THRESHOLD:
                auto_merge.append(item)

            elif sim >= self.REVIEW_THRESHOLD:
                ambiguous.append(item)

        return auto_merge, ambiguous


    def _build_canonical(self, auto_merge):

        parent = {}

        def find(x):
            parent.setdefault(x, x)
            if parent[x] != x:
                parent[x] = find(parent[x])
            return parent[x]

        def union(x, y):

            px = find(x)
            py = find(y)

            if px != py:
                root = px if len(px) <= len(py) else py
                parent[px] = root
                parent[py] = root

        for item in auto_merge:
            union(item["w1"], item["w2"])

        return {word: find(word) for word in parent}


    def _analyze_frequency(self, valid_svo, canonical_map):

        freq = {}

        for item in valid_svo:

            obj = item.get("object")

            if not obj:
                continue

            obj = obj.lower()
            obj = canonical_map.get(obj, obj)

            freq[obj] = freq.get(obj, 0) + 1

        return freq

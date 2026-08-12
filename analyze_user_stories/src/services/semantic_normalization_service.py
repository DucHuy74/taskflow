class SemanticNormalizationService:

    AUTO_MERGE_THRESHOLD = 0.8
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

        # 1. build context map
        action_context = {}

        for item in valid_svo:
            action = item.get("action")
            obj = item.get("object")

            if not action:
                continue

            action = action.lower()
            obj = obj.lower() if obj else None

            action_context.setdefault(action, set())
            if obj:
                action_context[action].add(obj)

        words = list(action_context.keys())

        print("\n===== ACTION CONTEXT =====")
        for k, v in action_context.items():
            print(k, "->", v)

        # 2. compare
        for i in range(len(words)):
            for j in range(i + 1, len(words)):

                w1 = words[i]
                w2 = words[j]

                try:
                    sim = float(
                        self.similarity_calculator.calculate(
                            w1, w2,
                            beta1=5.0,
                            beta2=1.3,
                            bias_b=-2.0
                        )
                    )
                except:
                    continue

                # context similarity
                ctx1 = action_context[w1]
                ctx2 = action_context[w2]

                if not ctx1 or not ctx2:
                    continue

                overlap = len(ctx1 & ctx2) / len(ctx1 | ctx2)

                print(f"[SIM] {w1} ~ {w2} = {sim:.3f} | ctx = {overlap:.2f}")

                results.append({
                    "w1": w1,
                    "w2": w2,
                    "similarity": sim,
                    "context_score": overlap
                })

        return results


    def _classify_similarity(self, similarity_results):

        auto_merge = []
        ambiguous = []

        for item in similarity_results:

            sim = item["similarity"]
            ctx = item["context_score"]

            # KEY LOGIC
            if sim >= 0.75 and ctx >= 0.5:
                auto_merge.append(item)

            elif sim >= 0.6:
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
                # chọn root ổn định hơn
                root = px if len(px) <= len(py) else py
                parent[px] = root
                parent[py] = root

        for item in auto_merge:
            union(item["w1"], item["w2"])

        
        all_words = set()
        for item in auto_merge:
            all_words.add(item["w1"])
            all_words.add(item["w2"])

        return {word: find(word) for word in all_words}


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
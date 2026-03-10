from typing import Dict, List

from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, association_rules
import pandas as pd

class StatisticsService:
    def generate_association_rules(self, svo_list, canonical_map=None):

        # Gom theo user_story_id → mỗi story là 1 transaction
        # VD: User story: As an admin, I want to manage users =>["admin", "manage", "users"]
        transactions = []

        
        # user_stories = [
        #     {"id": 1, "subject": "admin", "action": "create", "object": "user"},
        #     {"id": 2, "subject": "user", "action": "delete"},
        #     {"db_id": 3, "action": "update", "object": "profile"},
        # ]
        

        for svo in svo_list:

            transaction = set()
            
            s = svo.get("subject")
            a = svo.get("action")
            o = svo.get("object")

            if s:
                transaction.add(s.lower())

            if a:
                a = a.lower()
                a = canonical_map.get(a, a) if canonical_map else a
                transaction.add(a)

            if o:
                o = o.lower()
                o = canonical_map.get(o, o) if canonical_map else o
                transaction.add(o)
            
            if transaction:
                transactions.append(transaction)
        
        if not transactions:
            return [], []

        return self._run_apriori(transactions)
       
    
    def _run_apriori(self, transactions):

        te = TransactionEncoder()
        te_ary = te.fit(transactions).transform(transactions)
        df = pd.DataFrame(te_ary, columns=te.columns_)

        frequent_itemsets = apriori(
            df,
            min_support=0.1,
            use_colnames=True
        )

        rules_df = association_rules(
            frequent_itemsets,
            metric="confidence",
            min_threshold=0.5
        )

        rules_output = []

        for _, row in rules_df.iterrows():
            rules_output.append({
                "antecedents": list(row["antecedents"]),
                "consequents": list(row["consequents"]),
                "support": float(row["support"]),
                "confidence": float(row["confidence"]),
                "lift": float(row["lift"])
            })

        return transactions, rules_output
    
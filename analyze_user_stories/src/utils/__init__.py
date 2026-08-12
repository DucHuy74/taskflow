from collections import Counter
from typing import Optional, Tuple

from fastapi import Body


def find_subject(doc) -> Optional[str]:
    for token in doc:
        #prep = giới từ
        if token.lower_ == "as" and token.dep_ == "prep":
            for child in token.children:
                if child.dep_ == "pobj":
                    return child.lemma_
                
        if token.i > 5 and token.dep_ not in ("nsubj", "nsubjpass", "ROOT"):
            break
    return None


def find_verb_object(doc) -> Tuple[Optional[str], Optional[str]]:
    verb = None
    obj = None

    main_verb = None
    for token in doc:
        if token.dep_ == "ROOT" and token.pos_ == "VERB":
            main_verb = token
            break

    if not main_verb:
        return None, None
    
    true_verb = None #động từ thực sự mà muốn tìm

    for child in main_verb.children:
        # xcomp: bổ ngữ cho động từ chính(mệnh đề tân ngữ mở)
        if child.dep_ == "xcomp" and child.pos_ == "VERB":
            true_verb = child
            break

    verb_token = true_verb if true_verb else main_verb
    verb = verb_token.lemma_


    for child in verb_token.children:
        #dobj là tân ngữ trực tiếp
        #attr là thuộc tính
        #pobj là tân ngữ giới từ
        
        # direct object
        if child.dep_ in ("dobj", "obj", "attr"):
            obj = child.lemma_
            break
        
        # preposition object
        if child.dep_ == "prep":
            for prep_child in child.children:
                if prep_child.dep_ == "pobj":
                    obj = prep_child.lemma_
                    break
                
        if obj:
            break
    
    return verb, obj


def objects_frequency(svo):

    # phân tích tần xuất của object
    objects = [item['object'] for item in svo]

    object_counts = Counter(objects)

    total_objects = sum(object_counts.values())

    return {obj: round((count / total_objects) * 100, 2) 
                                for obj, count in object_counts.items()}


def print_similarity_results(title, results):
    print("\n" + "=" * 50)
    print(f"KẾT QUẢ ĐÁNH GIÁ {title} Sim353")
    print(f"   Tổng số cặp từ: {results['Sim353']['Total_Pairs']}")
    print("-" * 50)
    print(f"   Hệ số Tương quan Pearson (r): {results['Sim353']['Pearson_r']:.4f}")
    print(f"   Hệ số Tương quan Spearman (p): {results['Sim353']['Spearman_rho']:.4f}")

    print(f"KẾT QUẢ ĐÁNH GIÁ {title} Rg65")
    print(f"   Tổng số cặp từ: {results['RG65']['Total_Pairs']}")
    print("-" * 50)
    print(f"   Hệ số Tương quan Pearson (r): {results['RG65']['Pearson_r']:.4f}")
    print(f"   Hệ số Tương quan Spearman (p): {results['RG65']['Spearman_rho']:.4f}")


def route_handler(controller):
    async def handler(data: dict = Body(...)):
        return controller(data)
    return handler
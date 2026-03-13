from experiment.similatiryStrategies import (
    Calc_wordnet_similarity,
    Calc_w2v_similarity,
    Calculate_nonlinear_fusion
)

def build_similarity_calculator(word2Vec):

    calc_wordnet_similarity = Calc_wordnet_similarity()
    calc_w2v_similarity = Calc_w2v_similarity(word2Vec)

    return Calculate_nonlinear_fusion(
        word2Vec,
        calc_wordnet_similarity,
        calc_w2v_similarity
    )
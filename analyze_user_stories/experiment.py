import argparse
import numpy as np
from experiment import Calc_bert_similarity, Calc_sbert_similarity, Calc_wordnet_similarity, Calc_w2v_similarity, Calculate_nonlinear_fusion
from src.utils.model_loader import ensure_local_bert_model, ensure_local_sbert_model, load_models
from experiment import WordSimilarity, RunExperiment

def print_similarity_results_with_pvalues(title, results):
    print("\n" + "=" * 70)
    print(f"KẾT QUẢ ĐÁNH GIÁ {title}")
    print("=" * 70)
    for dataset_name, metrics in results.items():
        print(f"\n{dataset_name} (Tổng cặp từ: {metrics['Total_Pairs']})")
        print("-" * 70)
        print(f"  Pearson_r:     {metrics['Pearson_r']:8.4f}   (p-value: {metrics['Pearson_pvalue']:.4e})")
        print(f"  Spearman_rho:  {metrics['Spearman_rho']:8.4f}   (p-value: {metrics['Spearman_pvalue']:.4e})")
    print("=" * 70)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run word similarity experiments.")
    parser.add_argument("--enable-bert", action="store_true", help="Run BERT similarity evaluation")
    parser.add_argument("--enable-sbert", action="store_true", help="Run SBERT similarity evaluation")
    parser.add_argument("--download-similarity-models", action="store_true", help="Download and cache BERT/SBERT into the source tree")
    args = parser.parse_args()

    nlp, word2Vec = load_models()

    calcWordnetSimilarity = Calc_wordnet_similarity()
    calcW2vSimilarity = Calc_w2v_similarity(word2Vec)
    
    # Chọn hàm activation: 'sigmoid', 'tanh', 'relu', hoặc 'softmax'
    activation = 'sigmoid'  # Thay đổi giá trị này để dùng hàm khác
    calcNonlinearFusion = Calculate_nonlinear_fusion(word2Vec, calcWordnetSimilarity, calcW2vSimilarity, activation_type=activation)

    # tìm ra tham số tối ưu cho cách tiếp cận của chúng ta
    beta1_space = np.arange(1.5, 2.1, 0.1)
    beta2_space = np.arange(4.5, 5.1, 0.1)
    bias_b_space = np.arange(-3, -1, 0.1)

    # beta1_space = np.arange(0, 7, 0.1)
    # beta2_space = np.arange(0, 7, 0.1)
    # bias_b_space = np.arange(-5, 5, 0.1)

    print(f"Chạy experiment với activation function: {activation}")
    run_experiment = RunExperiment(word2Vec, calcNonlinearFusion)
    run_experiment.excute(beta1_space, beta2_space, bias_b_space)


    # nếu muốn gọi những cách khác và chỉ đơn thuần đo độ tương đồng thì chỉ cần gọi đến measure
    # class WordSimilarity
    word_similarity = WordSimilarity(word2Vec)
    wordnet_results = word_similarity.run(calcWordnetSimilarity)
    print_similarity_results_with_pvalues("WordNet", wordnet_results)

    w2v_results = word_similarity.run(calcW2vSimilarity)
    print_similarity_results_with_pvalues("Word2Vec", w2v_results)

    if args.download_similarity_models:
        bert_model_path = ensure_local_bert_model()
        sbert_model_path = ensure_local_sbert_model()
        print(f"Đã lưu BERT vào: {bert_model_path}")
        print(f"Đã lưu SBERT vào: {sbert_model_path}")

    if args.enable_bert:
        try:
            bert_model_path = ensure_local_bert_model()
            calcBertSimilarity = Calc_bert_similarity(model_name=str(bert_model_path))
            bert_results = word_similarity.run(calcBertSimilarity)
            print_similarity_results_with_pvalues("BERT", bert_results)
        except ImportError as exc:
            print(f"Bỏ qua BERT: {exc}")

    if args.enable_sbert:
        try:
            sbert_model_path = ensure_local_sbert_model()
            calcSbertSimilarity = Calc_sbert_similarity(model_name=str(sbert_model_path))
            sbert_results = word_similarity.run(calcSbertSimilarity)
            print_similarity_results_with_pvalues("SBERT", sbert_results)
        except ImportError as exc:
            print(f"Bỏ qua SBERT: {exc}")





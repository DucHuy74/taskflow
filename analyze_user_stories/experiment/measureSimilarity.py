import numpy as np
import pandas as pd
from scipy.stats import spearmanr, pearsonr
import json
from pathlib import Path
from interface.interface import AlgorithmsStrategy


EXPERIMENT_DIR = Path(__file__).resolve().parent
DATASET_DIR = EXPERIMENT_DIR / "dataset"

class WordSimilarity:
    def __init__(self, word2Vec):
        self.word2Vec = word2Vec
        self.load_sim353_dataset(DATASET_DIR / 'wordsim353' / 'combined.csv')
        self.load_rg65_dataset(DATASET_DIR / 'EN-RG-65.txt')
        self.load_mc30_dataset(DATASET_DIR / 'mc30.json')
        # self.load_simlex999_dataset('./experiment/dataset/SimLex-999/SimLex-999.txt')
        

    def load_sim353_dataset(self, filepath):
        df = pd.read_csv(filepath, sep=',')
        self.df_study_sim353 = df[['Word 1', 'Word 2', 'Human (mean)']].copy()
        self.df_study_sim353.rename(columns={'Human (mean)': 'Human_Score_Xi'}, inplace=True)
    def load_rg65_dataset(self, filepath):
        df = pd.read_csv(filepath, sep=r'\s+', names=['Word 1', 'Word 2', 'Human (mean)'])
        self.df_study_rg65 = df[['Word 1', 'Word 2', 'Human (mean)']].copy()
        self.df_study_rg65.rename(columns={'Human (mean)': 'Human_Score_Xi'}, inplace=True)
    def load_mc30_dataset(self, filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        dataset = [(item.get("term1"), item.get("term2"), item.get("value")) for item in data]
        df = pd.DataFrame(dataset, columns=['Word 1', 'Word 2', 'Human_Score_Xi'])
        self.df_study_mc30 = df.copy()
    # def load_simlex999_dataset(self, filepath):
    #     df = pd.read_csv(filepath, sep='\t', header=0)
    #     df = df[['word1', 'word2', 'SimLex999']].copy()
    #     df.rename(columns={'SimLex999': 'Human_Score_Xi'}, inplace=True)
    #     # lưu vào biến của class
    #     self.df_study_simlex999 = df

    def test_datasets(self):
        print("Sim353 Dataset:")
        print(self.df_study_sim353.head())
        print("\nRG65 Dataset:")
        print(self.df_study_rg65.head())
        print("\nMC30 Dataset:")
        print(self.df_study_mc30.head())
        # print("\nSimLex999 Dataset:")
        # print(self.df_study_simlex999.head())
    
    def calculate_spearman_rho(self, X_i, Y_i):
        rho, p_value = spearmanr(X_i, Y_i)
        return rho, p_value
    
    def calculate_pearson_r(self, X_i, Y_i):
        r, p_value = pearsonr(X_i, Y_i)
        return r, p_value


    ## dành riêng cho cách tiếp cận của mình tránh việc gridserach trên các beta và phải tính lại những giá trị tương đòng bằng wordnet và word2vec
    def extract_raw_scores(self, strategyWordnet: AlgorithmsStrategy, strategyWord2Vec: AlgorithmsStrategy):
        dataset_configs = {
            "RG65":      (self.df_study_rg65,    4.0, 'Word 1', 'Word 2'),
            "MC30":      (self.df_study_mc30,    4.0, 'Word 1', 'Word 2'),
            # "SimLex999": (self.df_study_simlex999, 10.0, 'word1', 'word2')
            "Sim353": (self.df_study_sim353, 10.0, 'Word 1', 'Word 2')
        }

        cached_data = {}

        for name, (df, scale_factor, col_w1, col_w2) in dataset_configs.items():
            if df is None: continue # Bỏ qua nếu chưa load dataset

            sim_wordnet_list = []
            sim_word2vec_list = []
            human_score_list = []

            for index, row in df.iterrows():
                w1 = row[col_w1]
                w2 = row[col_w2]
                
                s1 = strategyWordnet.calculate(w1, w2)
                
                s2 = strategyWord2Vec.calculate(w1, w2)
                
                h_score = row['Human_Score_Xi'] / scale_factor

                sim_wordnet_list.append(s1)
                sim_word2vec_list.append(s2)
                human_score_list.append(h_score)

            cached_data[name] = {
                'sim_wn': np.array(sim_wordnet_list, dtype=np.float64),
                'sim_w2v': np.array(sim_word2vec_list, dtype=np.float64),
                'human': np.array(human_score_list, dtype=np.float64)
            }
            
            print(f"   -> Đã cache xong {name}: {len(sim_wordnet_list)} cặp từ.")

        print("Hoàn tất trích xuất dữ liệu.")
        return cached_data
    
    def run(self, strategy: AlgorithmsStrategy, beta1=None, beta2=None, bias_b=None):
        algorithm_scores_Yi_Sim353 = []
        algorithm_scores_Yi_Rg65 = []
        algorithm_scores_Yi_Mc30 = []
        # algorithm_scores_Yi_Simlex999 = []

        for index, row in self.df_study_sim353.iterrows():
            w1 = row['Word 1']
            w2 = row['Word 2']

            if beta1 is not None and beta2 is not None and bias_b is not None:
                score = strategy.calculate(w1, w2, beta1=beta1, beta2=beta2, bias_b=bias_b)
            else:
                score = strategy.calculate(w1, w2)

            algorithm_scores_Yi_Sim353.append(score)

        for index, row in self.df_study_rg65.iterrows():
            w1 = row['Word 1']
            w2 = row['Word 2']

            score = strategy.calculate(w1, w2)

            algorithm_scores_Yi_Rg65.append(score)
            
        for index, row in self.df_study_mc30.iterrows():
            w1 = row['Word 1']
            w2 = row['Word 2']

            if beta1 is not None and beta2 is not None and bias_b is not None:
                score = strategy.calculate(w1, w2, beta1=beta1, beta2=beta2, bias_b=bias_b)
            else:
                score = strategy.calculate(w1, w2)

            algorithm_scores_Yi_Mc30.append(score)

        # for index, row in self.df_study_simlex999.iterrows():
        #     w1 = row['word1']
        #     w2 = row['word2']

        #     if beta1 is not None and beta2 is not None and bias_b is not None:
        #         score = strategy.calculate(w1, w2, beta1=beta1, beta2=beta2, bias_b=bias_b)
        #     else:
        #         score = strategy.calculate(w1, w2)

        #     algorithm_scores_Yi_Simlex999.append(score)

        

        #lấy ra 2 cột điểm để tính độ tương quan
        X_i_sim353 = self.df_study_sim353['Human_Score_Xi'] / 10.0
        X_i_rg65 = self.df_study_rg65['Human_Score_Xi'] / 4.0
        X_i_mc30 = self.df_study_mc30['Human_Score_Xi'] / 4.0
        # x_i_simlex999 = self.df_study_simlex999['Human_Score_Xi'] / 10.0

        # 1. Tính Pearson (r)
        r_pearson_sim353, p_pearson_sim353 = self.calculate_pearson_r(X_i_sim353, algorithm_scores_Yi_Sim353)
        r_pearson_rg65, p_pearson_rg65 = self.calculate_pearson_r(X_i_rg65, algorithm_scores_Yi_Rg65)
        r_pearson_mc30, p_pearson_mc30 = self.calculate_pearson_r(X_i_mc30, algorithm_scores_Yi_Mc30)
        # r_pearson_simlex999, p_pearson_simlex999 = self.calculate_pearson_r(x_i_simlex999, algorithm_scores_Yi_Simlex999)
        # 2. Tính Spearman (p/rho)
        rho_spearman_sim353, p_spearman_sim353 = self.calculate_spearman_rho(self.df_study_sim353['Human_Score_Xi'], algorithm_scores_Yi_Sim353)
        rho_spearman_rg65, p_spearman_rg65 = self.calculate_spearman_rho(self.df_study_rg65['Human_Score_Xi'], algorithm_scores_Yi_Rg65)
        rho_spearman_mc30, p_spearman_mc30 = self.calculate_spearman_rho(self.df_study_mc30['Human_Score_Xi'], algorithm_scores_Yi_Mc30)
        # rho_spearman_simlex999, p_spearman_simlex999 = self.calculate_spearman_rho(self.df_study_simlex999['Human_Score_Xi'], algorithm_scores_Yi_Simlex999)

        return {
            "Sim353": {
                "Total_Pairs": len(self.df_study_sim353),
                "Pearson_r": r_pearson_sim353,
                "Pearson_pvalue": p_pearson_sim353,
                "Spearman_rho": rho_spearman_sim353,
                "Spearman_pvalue": p_spearman_sim353
            },
            "RG65": {
                "Total_Pairs": len(self.df_study_rg65),
                "Pearson_r": r_pearson_rg65,
                "Pearson_pvalue": p_pearson_rg65,
                "Spearman_rho": rho_spearman_rg65,
                "Spearman_pvalue": p_spearman_rg65
            },
            "MC30": {
                "Total_Pairs": len(self.df_study_mc30),
                "Pearson_r": r_pearson_mc30,
                "Pearson_pvalue": p_pearson_mc30,
                "Spearman_rho": rho_spearman_mc30,
                "Spearman_pvalue": p_spearman_mc30
            },
            # "SimLex999": {
            #     "Total_Pairs": len(self.df_study_simlex999),
            #     "Pearson_r": r_pearson_simlex999,
            #     "Pearson_pvalue": p_pearson_simlex999,
            #     "Spearman_rho": rho_spearman_simlex999,
            #     "Spearman_pvalue": p_spearman_simlex999
            # }
        }

    


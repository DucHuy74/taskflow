import numpy as np
import multiprocessing as mp
from scipy.special import expit
from scipy.stats import pearsonr, spearmanr

# chạy phương pháp phi tuyến với Beta chạy từ 0.1 -> 5 bước nhảy 0.1 và bias từ -5 đến 5 bước nhảy 0.1
# nếu chạy hết các trên thì không khả quan lên giảm khoảng tìm kiếm lại để tìm ra khu vực vàng


# cấu hình để chạy phương pháp phi tuyến tính với nhiều process chọn ra con số tối ưu nhất
class GridSearchConfig:
    def __init__(self, cached_data, beta1_space, beta2_space, bias_b_space):
        self.cached_data = cached_data
        # có thể set phạm vi search của beta1, beta2, bias_b ở đây
        # tránh việc set range quá lớn và bước nhảy quá nhỏ
        self.beta1_space = beta1_space
        self.beta2_space = beta2_space
        self.bias_b_space = bias_b_space
        self.all_tasks = []
        for b1 in beta1_space:
            for b2 in beta2_space:
                for b in bias_b_space:
                    # Truyền dữ liệu cache vào từng task
                    self.all_tasks.append((b1, b2, b, self.cached_data))


    # beta1_space = np.arange(0.1, 5.1, 0.5)
    # beta2_space = np.arange(0.1, 5.1, 0.5)
    # bias_b_space = np.arange(-5.0, 5.1, 1)

    # # tiếp tục với phạm vi nhỏ hơn
    # beta1_space = np.arange(4, 5.1, 0.1)
    # beta2_space = np.arange(0.5, 1.5, 0.1)
    # bias_b_space = np.arange(-2.5, -1.5, 0.1)

    def worker_fast(self, params):
        beta1, beta2, bias_b, cached_data = params
        
        results = {}
        
        for ds_name, data in cached_data.items():
            sim_wn = data['sim_wn']
            sim_w2v = data['sim_w2v']
            human = data['human']
            
            fusion_scores = expit(beta1 * sim_wn + beta2 * sim_w2v + bias_b)
            
            try:
                # Pearson
                if np.std(fusion_scores) == 0: 
                    p_r = 0.0
                    p_r_pvalue = 1.0
                else: 
                    p_r, p_r_pvalue = pearsonr(fusion_scores, human)
                
                # Spearman
                if np.std(fusion_scores) == 0: 
                    s_rho = 0.0
                    s_rho_pvalue = 1.0
                else: 
                    s_rho, s_rho_pvalue = spearmanr(fusion_scores, human)
                
            except Exception:
                p_r, s_rho = 0.0, 0.0
                p_r_pvalue, s_rho_pvalue = 1.0, 1.0
                
            results[ds_name] = {
                "Pearson_r": p_r, 
                "Pearson_pvalue": p_r_pvalue,
                "Spearman_rho": s_rho,
                "Spearman_pvalue": s_rho_pvalue
            }

        total_score = results["RG65"]["Pearson_r"] + results["RG65"]["Spearman_rho"] + \
                    results["MC30"]["Pearson_r"] + results["MC30"]["Spearman_rho"] + \
                    results["Sim353"]["Pearson_r"] + results["Sim353"]["Spearman_rho"]
                    # results["SimLex999"]["Pearson_r"] + results["SimLex999"]["Spearman_rho"]
        
        return (total_score, beta1, beta2, bias_b, results)
        


    def parallel_grid_search(self):
        total_runs = len(self.all_tasks)
        print("=" * 50)
        print(f"BẮT ĐẦU GRID SEARCH TỐI ƯU HÓA (VECTORIZED)")
        print(f"Tổng số tổ hợp tham số: {total_runs}")
        print(f"Số lượng CPUs sử dụng: {mp.cpu_count()}")
        print("-" * 50)

        # Sử dụng tất cả core CPU có sẵn
        with mp.Pool(processes=mp.cpu_count()) as pool:
            # Chunksize lớn (ví dụ 1000) giúp giảm chi phí giao tiếp giữa các process
            results = pool.map(self.worker_fast, self.all_tasks, chunksize=1000)

        # Tìm kết quả tốt nhất
        max_total = -float('inf')
        best_params = None
        best_result = None

        for res in results:
            total, b1, b2, b, details = res
            
            if total > max_total:
                max_total = total
                best_params = (b1, b2, b)
                best_result = details

        print(f"HOÀN THÀNH TÌM KIẾM.")
        print(f"   Max Total Score: {max_total:.4f}")
        print(f"   Tham số Tối ưu: Beta1={best_params[0]:.2f}, Beta2={best_params[1]:.2f}, Bias={best_params[2]:.2f}")
        print("\nKết quả chi tiết:")
        for ds_name, metrics in best_result.items():
            print(f"\n   {ds_name}:")
            print(f"      Pearson_r: {metrics['Pearson_r']:.4f} (p-value: {metrics['Pearson_pvalue']:.4e})")
            print(f"      Spearman_rho: {metrics['Spearman_rho']:.4f} (p-value: {metrics['Spearman_pvalue']:.4e})")
        print("=" * 50)
        
        return best_result

import numpy as np
import matplotlib.pyplot as plt

# 1. Tham số Tối ưu tìm được
BETA1 = 4.60
BETA2 = 1.10
BIAS_B = -2.00

def sigmoid(x):
    """Hàm Sigmoid"""
    return 1.0 / (1.0 + np.exp(-x))

def showGraphSigmoid():
    X_input = np.linspace(-5, 7, 500) 

    # 3. Tính toán Y (Đầu ra Sigmoid)
    Y_output = sigmoid(X_input)

    # 4. Tính toán điểm trung tâm (Threshold) của mô hình
    # Ngưỡng (Threshold): Điểm X khiến Sigmoid trả về 0.5 (x = 0)
    # Threshold (x_threshold) = 0 - BIAS_B 
    # Threshold = -(BIAS_B) = 2.00
    X_threshold = -BIAS_B # Điểm này cho Y=0.5

    # 5. Vẽ đồ thị
    plt.figure(figsize=(10, 6))
    plt.plot(X_input, Y_output, label=f'Sigmoid Fusion Function (b={BIAS_B})', color='#007acc', linewidth=3)

    # Đánh dấu các điểm quan trọng
    plt.axvline(x=0, color='gray', linestyle='--', linewidth=1, label='X=0 (Input Zero)')
    plt.axhline(y=0.5, color='darkgreen', linestyle=':', linewidth=1, label='Y=0.5')
    plt.axvline(x=X_threshold, color='red', linestyle='-', linewidth=2, label=f'Model Threshold (x={X_threshold:.2f})')

    # Cấu hình đồ thị
    plt.title('Visualization of Sigmoid Fusion Function', fontsize=16)
    plt.xlabel(r'Linear Input $x = \beta_1 \cdot Sim_{W2V} + \beta_2 \cdot Sim_{WN} + b$', fontsize=12)
    plt.ylabel(r'Final Similarity $Sim_{Total} = \sigma(x)$', fontsize=12)
    plt.grid(True, which='both', linestyle='-', alpha=0.5)
    plt.xlim([-3, 5]) # Giới hạn trục X theo phạm vi thực tế tính toán
    plt.ylim([0, 1.05])
    plt.legend(fontsize=10)

    # Lưu đồ thị
    plt.savefig('sigmoid_fusion_visualization.png')
    plt.close()

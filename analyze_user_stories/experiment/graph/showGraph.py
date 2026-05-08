import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
import numpy as np 
from mpl_toolkits.mplot3d import Axes3D

def plot_heatmap(b1_coords, b2_coords, scores, beta1_values, beta2_values, fixed_bias):
    data = pd.DataFrame({
        'Beta1': b1_coords,
        'Beta2': b2_coords,
        'Total_Score': scores
    })

    score_matrix = data.pivot(index='Beta2', columns='Beta1', values='Total_Score')

    score_matrix = score_matrix.reindex(index=beta2_values[::-1])

    plt.figure(figsize=(10, 8))
    
    ax = sns.heatmap( 
        score_matrix,
        annot=True,            
        fmt=".3f",              
        cmap="viridis",          
        linewidths=.5,          
        cbar_kws={'label': 'Total Score (Pearson_r + Spearman_rho)'}
    )
    
    b1_labels = score_matrix.columns.values
    
    new_xticks = [f'{x:.1f}' for x in b1_labels]
    
    ax.set_xticklabels(new_xticks)
   
    b2_labels = score_matrix.index.values
    
    new_yticks = [f'{y:.1f}' for y in b2_labels]
    
  
    ax.set_yticklabels(new_yticks) 
    
    
    plt.title(f'Total Score Grid Search (Bias cố định: {fixed_bias:.2f})')
    plt.xlabel('Beta1 Value')
    plt.ylabel('Beta2 Value')
    plt.show()


def plot_3d_surface(b1_coords, b2_coords, scores, fixed_bias):
    data = pd.DataFrame({
        'Beta1': b1_coords,
        'Beta2': b2_coords,
        'Total_Score': scores
    })
    
    score_pivot = data.pivot_table(
        index='Beta2', 
        columns='Beta1', 
        values='Total_Score'
    ).sort_index(ascending=False).sort_index(axis=1)

    X_vals = score_pivot.columns.values  
    Y_vals = score_pivot.index.values 
    
    X, Y = np.meshgrid(X_vals, Y_vals)
    
    Z = score_pivot.values 
    
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')

    ax.plot_surface(X, Y, Z, 
                    cmap='viridis', 
                    edgecolor='none')
    
    ax.set_title(f'3D Surface Plot of Total Score (Bias cố định: {fixed_bias:.2f})')
    ax.set_xlabel('Beta1 Value')
    ax.set_ylabel('Beta2 Value')
    ax.set_zlabel('Total Score')
    
    plt.show()


def plot_contour(b1_coords, b2_coords, scores, fixed_bias):
    data = pd.DataFrame({
        'Beta1': b1_coords,
        'Beta2': b2_coords,
        'Total_Score': scores
    })
    
   
    score_pivot = data.pivot_table(index='Beta2', columns='Beta1', values='Total_Score').sort_index(ascending=False).sort_index(axis=1)

    X = score_pivot.columns.values
    Y = score_pivot.index.values
    Z = score_pivot.values
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    contour = ax.contour(X, Y, Z, 
                         levels=np.linspace(Z.min(), Z.max(), 15), 
                         colors='black', 
                         linewidths=0.8,
                         linestyles='dashed')
    
    ax.clabel(contour, inline=1, fontsize=10, fmt='%1.3f')

    heatmap = ax.contourf(X, Y, Z, 
                          levels=np.linspace(Z.min(), Z.max(), 100), # 100 mức màu mịn hơn
                          cmap='viridis')

    cbar = fig.colorbar(heatmap, label='Total Score (Pearson_r + Spearman_rho)')
    
    ax.plot(5.00, 1.30, 'o', color='red', markersize=8, label='Điểm Tối ưu (5.0, 1.3)')
    ax.legend()
    
    ax.set_title(f'Contour Plot of Total Score (Bias cố định: {fixed_bias:.2f})')
    ax.set_xlabel('Beta1 Value')
    ax.set_ylabel('Beta2 Value')
    
    plt.savefig('contour_plot.png')
    
    return "contour_plot.png"

def plot_scatter_colored(b1_coords, b2_coords, scores, fixed_bias):
    plt.figure(figsize=(10, 8))
    
    scatter = plt.scatter(
        x=b1_coords, 
        y=b2_coords, 
        c=scores, 
        s=200, 
        cmap='viridis', 
        marker='o'
    )
    
    cbar = plt.colorbar(scatter)
    cbar.set_label('Total Score (Pearson_r + Spearman_rho)')
    
   
    unique_b1 = sorted(list(set(b1_coords)))
    unique_b2 = sorted(list(set(b2_coords)))
    
    b1_labels_rounded = [f'{x:.1f}' for x in unique_b1]
    b2_labels_rounded = [f'{y:.1f}' for y in unique_b2]
    
    plt.xticks(unique_b1, b1_labels_rounded)
    
    plt.yticks(unique_b2, b2_labels_rounded)
    
    best_b1 = 5.0
    best_b2 = 1.3
    
    plt.plot(best_b1, best_b2, 'r*', markersize=20, label=f'Tối ưu: ({best_b1:.2f}, {best_b2:.2f})')
    plt.legend()
    
    plt.title(f'Colored Scatter Plot of Total Score (Bias cố định: {fixed_bias:.2f})')
    plt.xlabel('Beta1 Value')
    plt.ylabel('Beta2 Value')
    
    plt.savefig('colored_scatter_plot.png')
    
    return "colored_scatter_plot.png"
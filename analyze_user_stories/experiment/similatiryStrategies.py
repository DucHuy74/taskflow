from nltk.corpus import wordnet as wn
import numpy as np
from scipy.spatial.distance import cosine

from interface.interface import AlgorithmsStrategy


class Calc_wordnet_similarity(AlgorithmsStrategy):
    def __init__(self):
        pass
    
    def calculate(self, w1, w2):
        syn1 = wn.synsets(w1)
        syn2 = wn.synsets(w2)
        if not syn1 or not syn2:
            return 0.0 
        
        max_sim = 0.0 # Bắt đầu bằng 0.0
        for s1 in syn1:
            for s2 in syn2:
                sim = s1.wup_similarity(s2)
                # Chỉ cập nhật nếu sim tồn tại (không None) và lớn hơn max hiện tại
                if sim and sim > max_sim:
                    max_sim = sim
        return max_sim


class Calc_w2v_similarity(AlgorithmsStrategy):
    def __init__(self, word2Vec):
        self.word2Vec = word2Vec

    def calculate(self, w1, w2):
        if w1 not in self.word2Vec or w2 not in self.word2Vec:
            return 0.0
        
        return self.word2Vec.similarity(w1, w2)


def _normalize_cosine_similarity(similarity: float) -> float:
    if similarity is None or np.isnan(similarity):
        return 0.0

    return float(np.clip((similarity + 1.0) / 2.0, 0.0, 1.0))


class Calc_bert_similarity(AlgorithmsStrategy):
    def __init__(self, model_name: str = "bert-base-uncased", device: str = None):
        try:
            import torch
            from transformers import AutoModel, AutoTokenizer
        except ImportError as exc:
            raise ImportError(
                "Cần cài 'transformers' và 'torch' để dùng Calc_bert_similarity."
            ) from exc

        self.torch = torch
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        self.model.eval()
        self._embedding_cache = {}

    def _encode(self, text: str):
        cached_embedding = self._embedding_cache.get(text)
        if cached_embedding is not None:
            return cached_embedding

        encoded_inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
        )
        encoded_inputs = {key: value.to(self.device) for key, value in encoded_inputs.items()}

        with self.torch.no_grad():
            outputs = self.model(**encoded_inputs)

        token_embeddings = outputs.last_hidden_state
        attention_mask = encoded_inputs["attention_mask"].unsqueeze(-1).expand(token_embeddings.size()).float()
        summed_embeddings = (token_embeddings * attention_mask).sum(dim=1)
        token_counts = attention_mask.sum(dim=1).clamp(min=1e-9)
        sentence_embedding = (summed_embeddings / token_counts).squeeze(0).detach().cpu().numpy()
        self._embedding_cache[text] = sentence_embedding
        return sentence_embedding

    def calculate(self, w1, w2):
        if not w1 or not w2:
            return 0.0

        embedding_w1 = self._encode(str(w1))
        embedding_w2 = self._encode(str(w2))

        similarity = 1.0 - cosine(embedding_w1, embedding_w2)
        return _normalize_cosine_similarity(similarity)


class Calc_sbert_similarity(AlgorithmsStrategy):
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", device: str = None):
        from importlib import import_module

        try:
            SentenceTransformer = import_module("sentence_transformers").SentenceTransformer
        except ImportError as exc:
            raise ImportError(
                "Cần cài 'sentence-transformers' để dùng Calc_sbert_similarity."
            ) from exc

        self.model = SentenceTransformer(model_name, device=device)
        self._embedding_cache = {}

    def _encode(self, text: str):
        cached_embedding = self._embedding_cache.get(text)
        if cached_embedding is not None:
            return cached_embedding

        embedding = self.model.encode([text], normalize_embeddings=True)[0]
        self._embedding_cache[text] = embedding
        return embedding

    def calculate(self, w1, w2):
        if not w1 or not w2:
            return 0.0

        embedding_w1 = self._encode(str(w1))
        embedding_w2 = self._encode(str(w2))

        similarity = float(np.dot(embedding_w1, embedding_w2))
        return _normalize_cosine_similarity(similarity)

class Calculate_assm(AlgorithmsStrategy):
    def __init__(self, word2Vec_model, calc_wordnet_similarity: Calc_wordnet_similarity, calc_w2v_similarity: Calc_w2v_similarity):
        self.word2Vec_model = word2Vec_model
        self.calc_w2v_similarity = calc_w2v_similarity
        self.calc_wordnet_similarity = calc_wordnet_similarity

    def calculate(self, w1, w2):
        Sim_W2V = self.calc_w2v_similarity.calculate(w1, w2)
        
        Sim_WP = self.calc_wordnet_similarity.calculate(w1, w2)
        
        if Sim_W2V == 0.0 and Sim_WP == 0.0:
            return 0.0

        alpha = (Sim_WP + Sim_W2V) / 2.0
        
    
        if alpha > 1.0: alpha = 1.0
        if alpha < 0.0: alpha = 0.0
    
        beta = (alpha * Sim_WP) + ((1.0 - alpha) * Sim_W2V)

        ASSM_score = max(Sim_W2V, beta)
        
        return ASSM_score

class Calculate_with_adaptive_weighting(AlgorithmsStrategy):
    def __init__(self, word2Vec, calc_wordnet_similarity: Calc_wordnet_similarity, calc_w2v_similarity: Calc_w2v_similarity):
        self.word2Vec = word2Vec
        self.calc_w2v_similarity = calc_w2v_similarity
        self.calc_wordnet_similarity = calc_wordnet_similarity
    
    def calculate(self, w1, w2):
    # alpha = 0.7 nếu 2 từ có trong wordnet và 0.9 nếu 1 trong 2 không cso trong wordnet và 1 nếu không có trong wordnet
        syn1 = wn.synsets(w1)
        syn2 = wn.synsets(w2)

        alpha = 0.7
        if not syn1 or not syn2:
            # print(f"One of the words '{w1}' or '{w2}' is not in WordNet.")
            alpha = 0.9
        if not syn1 and not syn2:
            # print(f"Both words '{w1}' and '{w2}' are not in WordNet.")
            alpha = 1.0

        return alpha * self.calc_w2v_similarity.calculate(w1, w2) + (1 - alpha) * self.calc_wordnet_similarity.calculate(w1, w2)

class Calculate_nonlinear_fusion(AlgorithmsStrategy):

    def __init__(self, word2Vec_model, calc_wordnet_similarity: Calc_wordnet_similarity, calc_w2v_similarity: Calc_w2v_similarity, activation_type='sigmoid'):
        self.word2Vec_model = word2Vec_model
        self.calc_w2v_similarity = calc_w2v_similarity
        self.calc_wordnet_similarity = calc_wordnet_similarity
        self.activation_type = activation_type.lower()
        if self.activation_type not in ['sigmoid', 'tanh', 'relu', 'softmax']:
            raise ValueError("activation_type phải là 'sigmoid', 'tanh', 'relu', hoặc 'softmax'")

    def sigmoid(self, x):
        return 1.0 / (1.0 + np.exp(-x))

    def tanh(self, x):
        return np.tanh(x)

    def relu(self, x):
        return np.maximum(0.0, x)

    def softmax(self, x):
        if isinstance(x, (int, float)):
            return 1.0
        exp_x = np.exp(x - np.max(x))
        return exp_x / np.sum(exp_x)

    def _apply_activation(self, x):
        """Áp dụng hàm activation dựa trên activation_type"""
        if self.activation_type == 'sigmoid':
            return self.sigmoid(x)
        elif self.activation_type == 'tanh':
            return np.clip((self.tanh(x) + 1) / 2, 0, 1)  # Normalize tanh từ [-1,1] sang [0,1]
        elif self.activation_type == 'relu':
            return np.clip(self.relu(x), 0, 1)  # Clip ReLU sang [0,1]
        elif self.activation_type == 'softmax':
            return self.softmax(x)

    def calculate(self, w1, w2, beta1=None, beta2=None, bias_b=None):
    
        # Huownsg chọn B1 b2 và b sao cho phù hợp
        # tìm kiếm lưới sao cho đọ tương đồng gần với đánh giá của con người nhất
        # sim thuộc 0-> 1 và B
        sim_w2v = self.calc_w2v_similarity.calculate(w1, w2)
        sim_wn = self.calc_wordnet_similarity.calculate(w1, w2)

        sim_w2v = float(sim_w2v)
        sim_wn = float(sim_wn)
        
        x = (beta1 * sim_w2v) + (beta2 * sim_wn) + bias_b

        sim_total = self._apply_activation(x)

        return sim_total


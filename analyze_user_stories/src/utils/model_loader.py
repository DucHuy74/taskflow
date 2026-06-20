from pathlib import Path
import spacy
import nltk
from gensim.models import KeyedVectors
import gensim.downloader as api

BASE_DIR = Path(__file__).parent.parent.parent.resolve()

print(BASE_DIR)

word2vec_path = BASE_DIR / "word2vec-google-news-300.kv"
models_dir = BASE_DIR / "models"
bert_model_dir = models_dir / "bert-base-uncased"
sbert_model_dir = models_dir / "all-MiniLM-L6-v2"


def load_models():
    nlp = spacy.load("en_core_web_sm")
    for pkg in ['wordnet', 'omw-1.4']:
        try:
            nltk.data.find(f'corpora/{pkg}')
        except LookupError:
            nltk.download(pkg)


    # hãy chạy 2 dòng này trước để tải mô hình về máy và lưu lại sau đó comment lại
    # word2Vec = api.load("word2vec-google-news-300")
    # word2Vec.save("word2vec-google-news-300.kv")

    word2Vec = KeyedVectors.load(str(word2vec_path), mmap='r')
    return nlp, word2Vec


def ensure_local_bert_model():
    from transformers import AutoModel, AutoTokenizer

    if bert_model_dir.exists() and any(bert_model_dir.iterdir()):
        return bert_model_dir

    models_dir.mkdir(parents=True, exist_ok=True)
    tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
    model = AutoModel.from_pretrained("bert-base-uncased")
    tokenizer.save_pretrained(bert_model_dir)
    model.save_pretrained(bert_model_dir)
    return bert_model_dir


def ensure_local_sbert_model():
    from sentence_transformers import SentenceTransformer

    if sbert_model_dir.exists() and any(sbert_model_dir.iterdir()):
        return sbert_model_dir

    models_dir.mkdir(parents=True, exist_ok=True)
    model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    model.save(str(sbert_model_dir))
    return sbert_model_dir
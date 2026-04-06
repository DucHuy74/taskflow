from pathlib import Path
import spacy
import nltk
from gensim.models import KeyedVectors
import gensim.downloader as api

BASE_DIR = Path(__file__).parent.parent.parent.resolve()

print(BASE_DIR)

word2vec_path = BASE_DIR / "word2vec-google-news-300.kv"


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
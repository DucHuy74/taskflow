from pathlib import Path
import gc
import logging
import os


from dotenv import load_dotenv
import nltk
import spacy
from gensim.models import KeyedVectors


load_dotenv()


logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).parent.parent.parent.resolve()


word2vec_path = BASE_DIR / "word2vec-google-news-300.kv"
word2vec_vectors_path = BASE_DIR / "word2vec-google-news-300.kv.vectors.npy"
models_dir = BASE_DIR / "models"
light_word2vec_path = models_dir / "glove-wiki-gigaword-100.kv"
bert_model_dir = models_dir / "bert-base-uncased"
sbert_model_dir = models_dir / "all-MiniLM-L6-v2"


LIGHT_WORD2VEC_NAME = "glove-wiki-gigaword-100"


_MODEL_CACHE = None


WORD2VEC_MEMORY_HELP = (
    "Khong the nap Word2Vec (word2vec-google-news-300). "
    "Mo hinh can ~4-6 GB RAM trong khi nap (3M tu vung + vector 3.6 GB). "
    "Dat WORD2VEC_PROFILE=light trong .env de dung mo hinh nhe hon, "
    "hoac tang page file Windows."
)




def _load_spacy():
    gc.collect()
    try:
        return spacy.load("en_core_web_sm")
    except MemoryError as exc:
        gc.collect()
        try:
            return spacy.load("en_core_web_sm")
        except MemoryError as retry_exc:
            raise MemoryError(
                "Khong du RAM de nap spaCy. Dong ung dung nang khac, "
                "tang page file Windows, hoac dat WORD2VEC_PROFILE=light trong .env."
            ) from retry_exc




def _load_full_word2vec() -> KeyedVectors:
    if not word2vec_path.exists():
        raise FileNotFoundError(
            f"Khong tim thay file Word2Vec: {word2vec_path}. "
            "Dat WORD2VEC_PROFILE=light de dung mo hinh nhe hon."
        )


    if not word2vec_vectors_path.exists():
        raise FileNotFoundError(
            f"Khong tim thay file vector Word2Vec: {word2vec_vectors_path}. "
            "File .kv.vectors.npy phai nam cung thu muc voi file .kv."
        )


    gc.collect()
    try:
        return KeyedVectors.load(str(word2vec_path), mmap="r")
    except MemoryError as exc:
        raise MemoryError(WORD2VEC_MEMORY_HELP) from exc
    except OSError as exc:
        if "paging file" in str(exc).lower():
            raise MemoryError(WORD2VEC_MEMORY_HELP + " Loi he thong: page file Windows qua nho.") from exc
        raise




def _download_and_cache_light_word2vec() -> KeyedVectors:
    import gensim.downloader as api


    logger.warning(
        "Dang tai %s (~130 MB, nhe hon google-news-300). Lan dau can internet.",
        LIGHT_WORD2VEC_NAME,
    )
    models_dir.mkdir(parents=True, exist_ok=True)
    kv = api.load(LIGHT_WORD2VEC_NAME)
    kv.save(str(light_word2vec_path))
    logger.info("Da luu mo hinh nhe tai %s", light_word2vec_path)
    return kv




def _load_light_word2vec() -> KeyedVectors:
    gc.collect()


    if light_word2vec_path.exists():
        try:
            return KeyedVectors.load(str(light_word2vec_path), mmap="r")
        except MemoryError:
            gc.collect()
            return KeyedVectors.load(str(light_word2vec_path), mmap=None)


    return _download_and_cache_light_word2vec()




def _word2vec_profile() -> str:
    return os.getenv("WORD2VEC_PROFILE", "auto").strip().lower()




def _load_word2vec() -> KeyedVectors:
    profile = _word2vec_profile()


    if profile == "light":
        logger.info("WORD2VEC_PROFILE=light, dung %s", LIGHT_WORD2VEC_NAME)
        return _load_light_word2vec()


    if profile == "full":
        logger.info("WORD2VEC_PROFILE=full, dung word2vec-google-news-300")
        return _load_full_word2vec()


    if word2vec_path.exists() and word2vec_vectors_path.exists():
        try:
            logger.info("WORD2VEC_PROFILE=auto, thu nap word2vec-google-news-300")
            return _load_full_word2vec()
        except MemoryError:
            logger.warning(
                "Khong du RAM cho word2vec-google-news-300, fallback sang %s",
                LIGHT_WORD2VEC_NAME,
            )
            gc.collect()
            return _load_light_word2vec()


    logger.warning(
        "Khong tim thay word2vec-google-news-300, dung %s",
        LIGHT_WORD2VEC_NAME,
    )
    return _load_light_word2vec()




def load_models():
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE


    if _word2vec_profile() == "light":
        word2Vec = _load_word2vec()
        nlp = _load_spacy()
    else:
        nlp = _load_spacy()
        word2Vec = _load_word2vec()


    for pkg in ["wordnet", "omw-1.4"]:
        try:
            nltk.data.find(f"corpora/{pkg}")
        except LookupError:
            nltk.download(pkg)


    _MODEL_CACHE = (nlp, word2Vec)
    logger.info(
        "Loaded spaCy and Word2Vec (profile=%s, vocab=%d)",
        _word2vec_profile(),
        len(word2Vec),
    )
    return _MODEL_CACHE




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
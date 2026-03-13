import threading

from fastapi import FastAPI
from constant import DATABASE_URL
from src.routes.statistics_router import router as statistics_router
from src.database  import DatabaseManager
from src.routes.analyze_router import router as analyze_router
from src.workers.parse_worker import run_worker

app = FastAPI(title="My Project API")

# Gắn router từ routes.py
app.include_router(analyze_router)
app.include_router(statistics_router)
DatabaseManager(DATABASE_URL)

@app.get("/")
def read_root():
    return {"message": "Hello World"}

@app.on_event("startup")
def start_worker():

    thread = threading.Thread(target=run_worker, daemon=True)
    thread.start()

import threading

from fastapi import FastAPI
from constant import DATABASE_URL
from src.database  import DatabaseManager
from src.routes.analyze_router import router as analyze_router
# from src.routes.neo4j_controller import router as neo4j_router

app = FastAPI(title="My Project API")

# Gắn router từ routes.py
app.include_router(analyze_router)
# app.include_router(neo4j_router)
DatabaseManager(DATABASE_URL)

@app.get("/")
def read_root():
    return {"message": "Hello World"}


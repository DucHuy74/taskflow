from fastapi import FastAPI
from src.utils.structured_logging import configure_structured_logging

configure_structured_logging()

from src.routes.analyze_router import router as analyze_router
# from src.routes.neo4j_controller import router as neo4j_router

app = FastAPI(title="TaskFlow Analysis API")

# Gắn router từ routes.py
app.include_router(analyze_router)
# app.include_router(neo4j_router)
@app.get("/")
def read_root():
    return {"service": "taskflow-analysis", "status": "ok"}


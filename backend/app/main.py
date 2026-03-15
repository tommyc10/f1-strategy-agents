import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import data, strategy, summariser, orchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="F1 Strategy Agents", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(data.router)
app.include_router(strategy.router)
app.include_router(summariser.router)
app.include_router(orchestrator.router)


@app.get("/health")
async def health():
    return {"status": "ok"}

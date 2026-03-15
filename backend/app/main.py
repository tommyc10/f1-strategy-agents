import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.routers import data, strategy, summariser, orchestrator, fastf1_router
from app.agents.data_agent import fetch_race_context
from app.agents.strategy_agent import analyse_strategy
from app.agents.summariser_agent import create_briefing

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
app.include_router(fastf1_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data_msg = await ws.receive_json()

            if data_msg.get("type") != "query":
                await ws.send_json({"type": "error", "message": "Unknown message type"})
                continue

            question = data_msg.get("question", "")
            session_key = data_msg.get("session_key")

            for agent in ["data", "strategy", "summariser"]:
                await ws.send_json({"type": "status", "agent": agent, "state": "pending"})

            try:
                await ws.send_json({"type": "status", "agent": "data", "state": "running"})
                race_context = await fetch_race_context(session_key=session_key)
                await ws.send_json({"type": "status", "agent": "data", "state": "complete"})

                await ws.send_json({"type": "status", "agent": "strategy", "state": "running"})
                strategy_output = await analyse_strategy(question, race_context)
                await ws.send_json({"type": "status", "agent": "strategy", "state": "complete"})

                await ws.send_json({"type": "status", "agent": "summariser", "state": "running"})
                briefing = await create_briefing(strategy_output, race_context)
                await ws.send_json({"type": "status", "agent": "summariser", "state": "complete"})

                await ws.send_json({
                    "type": "result",
                    "briefing": briefing,
                    "strategy_reasoning": strategy_output.reasoning,
                    "race_context": race_context.model_dump(),
                })
            except Exception as e:
                logger.error("Pipeline error: %s", e)
                await ws.send_json({"type": "error", "message": str(e)})
    except WebSocketDisconnect:
        pass

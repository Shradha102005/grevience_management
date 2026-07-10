# ── Windows event-loop fix: must be before everything else ───────────────────
import sys
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
# ─────────────────────────────────────────────────────────────────────────────

from dotenv import load_dotenv
load_dotenv()  # Load .env before any os.getenv() calls in routers

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logger = logging.getLogger(__name__)

from database import init_db
from routers import auth as auth_router
from routers import disaster as disaster_router
from routers import election as election_router
from routers import municipal as municipal_router
from routers import ai_chat as ai_chat_router
from routers import live_data as live_data_router
from routers import schemes as schemes_router
from routers import voice as voice_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("✅ Database initialized.")
    yield


app = FastAPI(
    title="CIVICOS AI — Governance Backend",
    description="REST API for citizen governance, authentication and all 9 service modules.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(disaster_router.router)
app.include_router(election_router.router)
app.include_router(municipal_router.router)
app.include_router(ai_chat_router.router)
app.include_router(live_data_router.router)
app.include_router(schemes_router.router)
app.include_router(voice_router.router)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
def health():
    return {"status": "ok", "service": "CIVICOS AI Backend"}

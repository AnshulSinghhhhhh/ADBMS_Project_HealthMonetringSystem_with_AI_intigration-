"""
backend/main.py
---------------
FastAPI entry point with CORS, rate-limit error handling, and all routers.
"""

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

from database import engine, Base
import models  # noqa: F401

from routers import auth, vitals, medications, alerts, health, reports, profile

load_dotenv(override=True)

# ── Create tables ──────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── Rate limiter (shared across all routers) ───────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="HealthAI API",
    description="AI-powered health monitoring backend",
    version="1.0.0",
)

# Attach limiter to app state so routers can import it
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
origins = [url.strip() for url in FRONTEND_URL.split(",")] if FRONTEND_URL != "*" else ["*"]

# Also explicitly add 127.0.0.1 if localhost is specified (common for local dev)
if any("localhost" in o for o in origins):
    origins.append([o.replace("localhost", "127.0.0.1") for o in origins if "localhost" in o][0])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(vitals.router)
app.include_router(medications.router)
app.include_router(alerts.router)
app.include_router(health.router)
app.include_router(reports.router, prefix="/reports")
app.include_router(profile.router)


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", tags=["Root"])
def root():
    return {"status": "HealthAI API is running"}

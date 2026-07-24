import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.tasks import daily_reset


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Owns the background job that clears `slap_count_today` / `rose_count_today`
    at every local midnight. Starting it here rather than on first request
    means it also runs its catch-up pass at boot, so a boundary missed while
    the service was down is handled on the next start.
    """
    daily_reset.start(app)
    try:
        yield
    finally:
        await daily_reset.stop(app)


app = FastAPI(lifespan=lifespan)
origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import user  


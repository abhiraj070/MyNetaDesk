from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.tasks import daily_reset


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Owns the background job that clears `slap_count_today` / `rose_count_today`
    at every local midnight. Starting it here rather than on first request
    means it also runs its catch-up pass at boot, so a boundary missed while
    the service was down is handled on the next start.

    Also ensures the `feedback` table (and its `reaction` enum) exists. It's the
    one table this repo owns via a SQLAlchemy model — every other table is
    created externally and reflected — and the project's Alembic setup is an
    unused stub, so `checkfirst` creation on boot is the pragmatic home for it.
    """
    from app.db.connect import engine
    from app.model.feedback import Feedback

    Feedback.__table__.create(bind=engine, checkfirst=True)

    daily_reset.start(app)
    try:
        yield
    finally:
        await daily_reset.stop(app)


app = FastAPI(title="MyNetaji", lifespan=lifespan)
origins = [
    origin.strip()
    for origin in get_settings().CORS_ORIGINS.split(",")
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


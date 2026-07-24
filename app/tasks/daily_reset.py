"""
Daily reset of the `slap_count_today` / `rose_count_today` counters.

Design notes, since "reset every 24 hours" has several tempting-but-wrong
implementations:

* **Not per request.** Checking (or worse, rewriting) the counters on every
  vote or every read would put a write on the hot path for no benefit. This
  runs exactly twice a day at most: once at the boundary, once at startup as a
  catch-up.
* **Not "sleep 86400".** A fixed sleep drifts, and it resets at whatever time
  the process happened to start. This sleeps until the next local midnight and
  recomputes the target every iteration, so restarts and DST shifts don't move
  the boundary.
* **Atomic.** The whole reset — both tables plus the bookkeeping row — runs in
  one transaction via `engine.begin()`. Either the day rolls over completely or
  not at all.
* **Safe with multiple workers.** Uvicorn with `--workers N` (or several
  instances behind a load balancer) would otherwise run N resets. A Postgres
  transaction-level advisory lock means exactly one of them does the work and
  the rest return immediately; the lock is released with the transaction, even
  if the process dies mid-way.
* **Survives downtime.** `daily_counter_resets.last_reset_on` records the last
  day that was cleared. On startup — and on every tick — a day that has already
  been reset is skipped, and a boundary missed while the service was down is
  caught up on the next start. This is also what makes a restart safe: without
  it, every deploy would wipe the day's counters.
* **Minimal database load.** The `WHERE` clause touches only rows that actually
  carry a non-zero counter, so on a quiet day the UPDATE writes nothing. It is
  `IS DISTINCT FROM 0` rather than `<> 0` because the `_today` columns are
  nullable and `NULL <> 0` is NULL, not true — plain `<>` would skip exactly
  the rows that most need normalising, and they would stay NULL forever.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import text

from app.db.connect import engine

# Deliberately uvicorn's own logger rather than `__name__`: uvicorn configures
# handlers for its loggers only and leaves the root logger bare, so a module
# logger's output is swallowed. A daily job that runs silently is a job nobody
# can tell has stopped.
logger = logging.getLogger("uvicorn.error")

# Any stable 64-bit integer works; it only has to be unique among the advisory
# locks this database uses.
_LOCK_KEY = 8_412_553_001

_BOOKKEEPING_DDL = text(
    """
    CREATE TABLE IF NOT EXISTS daily_counter_resets (
        id smallint PRIMARY KEY,
        last_reset_on date NOT NULL,
        CONSTRAINT daily_counter_resets_singleton CHECK (id = 1)
    )
    """
)

_RESET_STATEMENTS = (
    text(
        """
        UPDATE chief_ministers
           SET slap_count_today = 0, rose_count_today = 0
         WHERE slap_count_today IS DISTINCT FROM 0
            OR rose_count_today IS DISTINCT FROM 0
        """
    ),
    text(
        """
        UPDATE ministers
           SET slap_count_today = 0, rose_count_today = 0
         WHERE slap_count_today IS DISTINCT FROM 0
            OR rose_count_today IS DISTINCT FROM 0
        """
    ),
)


def _zone():
    """
    The day boundary is a local one — "today" on a civic app for India means
    the Indian calendar day, not UTC. Falls back to UTC if the host has no tz
    database (slim containers often don't ship one).
    """
    name = os.getenv("RESET_TIMEZONE", "Asia/Kolkata")
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        logger.warning("Timezone %s unavailable; falling back to UTC.", name)
        return ZoneInfo("UTC")


def seconds_until_next_midnight(now=None):
    """Seconds from `now` to the next local midnight (never zero or negative)."""
    zone = _zone()
    now = now or datetime.now(zone)
    tomorrow = (now + timedelta(days=1)).date()
    boundary = datetime.combine(tomorrow, datetime.min.time(), tzinfo=zone)
    return max(1.0, (boundary - now).total_seconds())


def run_daily_reset():
    """
    Clear both tables' daily counters if today's boundary hasn't been handled.

    Synchronous on purpose: the project's engine is the sync one, so the async
    caller hands this to a worker thread rather than blocking the event loop.
    Returns a short status string for the logs.
    """
    today = datetime.now(_zone()).date()

    with engine.begin() as conn:
        conn.execute(_BOOKKEEPING_DDL)

        # Transaction-scoped: released automatically on commit, rollback, or a
        # dropped connection. Whoever loses the race simply does nothing.
        if not conn.execute(
            text("SELECT pg_try_advisory_xact_lock(:key)"), {"key": _LOCK_KEY}
        ).scalar():
            return "skipped: another worker holds the lock"

        last_reset_on = conn.execute(
            text("SELECT last_reset_on FROM daily_counter_resets WHERE id = 1")
        ).scalar()

        if last_reset_on is not None and last_reset_on >= today:
            return f"skipped: already reset for {today}"

        cleared = sum(conn.execute(stmt).rowcount for stmt in _RESET_STATEMENTS)

        conn.execute(
            text(
                """
                INSERT INTO daily_counter_resets (id, last_reset_on)
                VALUES (1, :today)
                ON CONFLICT (id) DO UPDATE SET last_reset_on = EXCLUDED.last_reset_on
                """
            ),
            {"today": today},
        )

        return f"reset {cleared} row(s) for {today}"


async def _reset_loop():
    while True:
        try:
            logger.info("Daily counter reset: %s", await asyncio.to_thread(run_daily_reset))
        except asyncio.CancelledError:
            raise
        except Exception:
            # A failed run must not kill the loop — the next boundary (or the
            # next restart) gets another go, and the bookkeeping row means a
            # skipped day is caught up rather than silently lost.
            logger.exception("Daily counter reset failed; retrying at the next boundary.")

        await asyncio.sleep(seconds_until_next_midnight())


def start(app):
    """Attach the loop to the app's lifespan. Call once, from the lifespan."""
    app.state.daily_reset_task = asyncio.create_task(_reset_loop())


async def stop(app):
    task = getattr(app.state, "daily_reset_task", None)
    if task is None:
        return
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

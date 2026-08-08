from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Integer,
    String,
    UniqueConstraint,
)

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


# The three entity tables a verdict can be cast on. MLAs are deliberately
# absent — they are out of scope and have no table.
POLITICIAN_TYPES = ("cm", "union_minister", "mp")

_TYPE_CHECK = "politician_type in ('cm', 'union_minister', 'mp')"


"""
Daily slap/rose tallies, one row per politician per day.

On the identifier
-----------------
The brief asks for `politician_id`, and that is what these carry — but it takes
a `politician_type` alongside it to mean anything, because the ids are only
unique *within* their own table:

    chief_ministers.id   1 .. 31
    ministers.id         1 .. 90     <- overlaps chief_ministers
    mps.id            1755 .. 2297

Without the discriminator, Chief Minister 5 and Union Minister 5 would share a
row and add their verdicts together. The pair (politician_type, politician_id)
is the existing identity: it is the same shape `politicians.subject_type`
already uses, and it points at rows in the tables that are already there — no
parallel politician system, and nothing to backfill.

A plain foreign key to `politicians.id` was the other candidate and does not
work: that table holds only Chief Ministers and Union Ministers (100 rows, no
MPs), so an FK there would have excluded every MP.
"""


class RoseCountToday(Base):
    __tablename__ = "rose_count_today"

    id = Column(Integer, primary_key=True)
    politician_type = Column(String, nullable=False)
    politician_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False, index=True)
    count = Column(Integer, nullable=False, default=0, server_default="0")
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "politician_type", "politician_id", "date", name="uq_rose_count_today_day"
        ),
        CheckConstraint(_TYPE_CHECK, name="ck_rose_count_today_type"),
    )


class SlapCountToday(Base):
    __tablename__ = "slap_count_today"

    id = Column(Integer, primary_key=True)
    politician_type = Column(String, nullable=False)
    politician_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False, index=True)
    count = Column(Integer, nullable=False, default=0, server_default="0")
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "politician_type", "politician_id", "date", name="uq_slap_count_today_day"
        ),
        CheckConstraint(_TYPE_CHECK, name="ck_slap_count_today_type"),
    )

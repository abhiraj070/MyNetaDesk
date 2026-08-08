from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    Text,
    UniqueConstraint,
)

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class MpHindi(Base):
    """Hindi for the `mps` table, one row per MP.

    A side table rather than `*_hindi` columns on `mps` — which is how
    `chief_ministers` and `ministers` carry theirs — because `mps` is a
    reloaded dataset: the import that refreshes it would drop hand-written
    Hindi columns along with everything else. Keeping the translations beside
    it means a reload can't take them with it.

    `mp_id` is the whole relationship: unique, cascading, and pointing at the
    real row, so every Hindi record maps to exactly one MP and can never
    outlive them. The English `name`/`state`/`constituency` are copied in
    alongside so a row is reviewable on its own — you can read the pair without
    joining back — and so a stale translation is visible when the source text
    changes underneath it.

    Anything not yet translated stays NULL on purpose. Every read path
    coalesces to the English column, so a missing translation degrades to
    English rather than to a blank.
    """

    __tablename__ = "mps_hindi"

    id = Column(Integer, primary_key=True)
    # The foreign key itself is declared in the migration, not here: `mps` is
    # a reflected table rather than a model on this Base, so SQLAlchemy has no
    # `mps` to resolve the reference against at import time. The constraint is
    # real in Postgres either way — see the migration.
    mp_id = Column(Integer, nullable=False, index=True)

    # The English source text, copied from `mps` at the time of translation.
    name = Column(Text)
    state = Column(Text)
    constituency = Column(Text)

    # The Hindi counterparts. NULL means "not translated yet", never "blank".
    name_hindi = Column(Text)
    state_hindi = Column(Text)
    constituency_hindi = Column(Text)

    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

    __table_args__ = (
        UniqueConstraint("mp_id", name="uq_mps_hindi_mp"),
    )

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    Text,
)

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class MpPoliticalMilestone(Base):
    """One position, tenure or milestone in an MP's political career.

    Career history only — attendance, questions, debates, MPLADS and project
    figures are Performance data and do not belong here.

    Nothing about the person is repeated: no name, no photo, no party, no
    constituency. `mp_id` is the only link, so an MP's details are corrected in
    one place and every milestone follows.

    `source` is required by design rather than by convention. A political
    milestone with no citation is a claim nobody can check, and this table is
    the one place in the app where a wrong entry would put words in a real
    person's biography. A row with no verified source should not exist.

    The foreign key itself is declared in the migration: `mps` is reflected at
    runtime rather than modelled on this Base, so SQLAlchemy has no table object
    to resolve the reference against at import time. It is a real FK in
    Postgres, `ON DELETE CASCADE`, so milestones cannot outlive their MP.
    """

    __tablename__ = "mp_political_milestone"

    id = Column(Integer, primary_key=True)
    mp_id = Column(Integer, nullable=False, index=True)

    # NULL `end_date` means the position is still held; `is_current` says the
    # same thing in the form the UI and the ordering actually query on.
    start_date = Column(Date)
    end_date = Column(Date)

    position_title = Column(Text, nullable=False)
    # Display order for the journey, ascending: 1 is the top of the timeline.
    position_rank = Column(Integer, nullable=False, default=0)

    # Both NULL when the position was not arrived at by an election —
    # an appointment, a nomination, a party office.
    election_type = Column(Text)
    entry_mode = Column(Text)

    is_current = Column(Boolean, nullable=False, default=False)
    source = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_now, onupdate=_now, nullable=False
    )

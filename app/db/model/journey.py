from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB

from app.db.connect import Base


def _now():
    return datetime.now(timezone.utc)


class Politician(Base):
    __tablename__ = "politicians"

    id = Column(Integer, primary_key=True)
    subject_type = Column(String, nullable=False)
    cm_id = Column(Integer, nullable=True, index=True)
    canonical_name = Column(Text, nullable=False)
    state = Column(Text)
    state_key = Column(Text)
    party = Column(Text)
    ministries = Column(ARRAY(Text))
    house = Column(String)
    myneta_group_id = Column(Text)
    wikipedia_title = Column(Text)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now, nullable=False)
    __table_args__ = (
        UniqueConstraint(
            "subject_type", "canonical_name", "state_key", name="uq_politician_identity"
        ),
    )


class PoliticalMilestone(Base):
    __tablename__ = "political_milestones"

    id = Column(Integer, primary_key=True)
    politician_id = Column(
        Integer, ForeignKey("politicians.id", ondelete="CASCADE"), nullable=False, index=True
    )
    year = Column(Integer, nullable=False, index=True)
    start_date = Column(Date)
    end_date = Column(Date)
    date_precision = Column(String)
    position_title = Column(Text, nullable=False)
    position_rank = Column(String)
    rank_order = Column(Integer)
    party = Column(Text)
    party_inferred = Column(Boolean, default=False, nullable=False)
    constituency = Column(Text)
    election_type = Column(String)
    entry_mode = Column(String)
    is_current = Column(Boolean, default=False, nullable=False)
    also_held = Column(ARRAY(Text))
    sources = Column(JSONB)
    sort_index = Column(Integer, nullable=False, default=0)

    __table_args__ = (
        UniqueConstraint(
            "politician_id", "year", "position_title", "constituency",
            name="uq_milestone_natural",
        ),
    )


class WealthDeclaration(Base):
    __tablename__ = "wealth_declarations"
    id = Column(Integer, primary_key=True)
    politician_id = Column(
        Integer, ForeignKey("politicians.id", ondelete="CASCADE"), nullable=False, index=True
    )
    milestone_id = Column(
        Integer, ForeignKey("political_milestones.id", ondelete="SET NULL"), nullable=True
    )
    election_year = Column(Integer, nullable=False, index=True)
    election_name = Column(Text)
    myneta_dataset_slug = Column(Text, nullable=False)
    myneta_candidate_id = Column(Text, nullable=False)
    source_url = Column(Text)
    holder_scope = Column(String, default="family", nullable=False)
    declaration_type = Column(String, default="election_affidavit", nullable=False, index=True)
    total_assets = Column(BigInteger)
    total_liabilities = Column(BigInteger)
    movable_assets = Column(BigInteger)
    immovable_assets = Column(BigInteger)
    cash = Column(BigInteger)
    bank_deposits = Column(BigInteger)
    shares_investments = Column(BigInteger)
    mutual_funds = Column(BigInteger)
    jewellery = Column(BigInteger)
    vehicles = Column(BigInteger)
    residential_property = Column(BigInteger)
    commercial_property = Column(BigInteger)
    agricultural_land = Column(BigInteger)
    other_assets = Column(BigInteger)
    warnings = Column(ARRAY(Text))
    fetched_at = Column(DateTime(timezone=True), default=_now, nullable=False)
    __table_args__ = (
        UniqueConstraint(
            "politician_id", "myneta_dataset_slug", "myneta_candidate_id",
            name="uq_wealth_natural",
        ),
    )


JOURNEY_TABLES = (
    Politician.__table__,
    PoliticalMilestone.__table__,
    WealthDeclaration.__table__,
)

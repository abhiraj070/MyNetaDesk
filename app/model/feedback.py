from app.db.connect import Base
from sqlalchemy import Column, String, DateTime, Enum as SqlEnum
from datetime import datetime, timezone, Integer
from enum import Enum

class Reaction(str, Enum):
    Slap= "Slap"
    rose= "Rose"

class Feedback(Base):
    __tablename__="feedback"
    id = Column(Integer, primary_key=True)
    reaction = Column(SqlEnum(Reaction, name="reaction"), nullable=False)
    message = Column(String)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
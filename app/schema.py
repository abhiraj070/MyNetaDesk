from typing import Optional

from pydantic import BaseModel


class LocationRequest(BaseModel):
    latitude: float
    longitude: float
    # Optional with an English default, so a client that sends nothing keeps
    # the exact behaviour it had before localisation existed.
    lang: str = "en"


class MinistrySearchRequest(BaseModel):
    name: Optional[str] = None
    lang: str = "en"

class UpdateMemberRequest(BaseModel):
    table_to_update: str
    name_field_to_update: str
    constituency_key: str
    field_to_update: str

class UpdateMinistryRequest(BaseModel):
    name_field_to_update: str
    ministry_name: str
    field_to_update: str

class GetMinisterRequest(BaseModel):
    name: str
    ministry: str
    lang: str = "en"

class GetMpRequest(BaseModel):
    # Defaults matter: in Pydantic v2 `Optional[str]` on its own is still a
    # required field, so without them every lookup had to send all three.
    # With them, an empty body means "list all", mirroring GetCmRequest.
    name: Optional[str] = None
    id: Optional[int] = None
    lang: str = "en"
    constituency_key: Optional[str] = None

class GetMpTimelineRequest(BaseModel):
    id: int
    lang: str = "en"

class GetCmRequest(BaseModel):
    state_key: Optional[str] = None
    lang: str = "en"

class UpdateCmRequest(BaseModel):
    name_field_to_update: str
    state_key: str
    field_to_update: str

class TweetRequest(BaseModel):
    name: str
    table: str

class FeedbackRequest(BaseModel):
    reaction: str
    message: str

class GetAssetsRequest(BaseModel):
    name: str
    designation: str
    party: str
    lang: str = "en"

class UpdateMpsRequest(BaseModel):
    name: str
    constituency_key: str
    field_to_update: str
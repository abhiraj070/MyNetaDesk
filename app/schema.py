from typing import Optional

from pydantic import BaseModel


class LocationRequest(BaseModel):
    latitude: float
    longitude: float


class MinistrySearchRequest(BaseModel):
    name: Optional[str] = None

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

class GetMpRequest(BaseModel):
    name: str
    constituency_key: str

class GetCmRequest(BaseModel):
    state_key: Optional[str] = None

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
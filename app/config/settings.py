from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="app/.env")

    DB_URL: str
    BEARER_TOKEN_X: str
    # Comma-separated list of frontend origins allowed by CORS.
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

@lru_cache
def get_settings():
    return settings()

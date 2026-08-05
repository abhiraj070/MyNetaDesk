import redis.asyncio as redis
from app.config.settings import get_settings

_settings = get_settings()
redis_client = redis.from_url(
    _settings.REDIS_URL,
    decode_responses=True,
)
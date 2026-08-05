from apscheduler.schedulers.asyncio import AsyncIOScheduler
from zoneinfo import ZoneInfo
import httpx
import json
from app.config.settings import get_settings
import asyncio
from app.core.redis import redis_client
scheduler = AsyncIOScheduler(
    timezone=ZoneInfo("Asia/Kolkata")
)
_settings = get_settings()

async def fetch_news():
    url = "https://newsdata.io/api/1/latest"
    params1= {
        "apikey": _settings.NEWSDATA_API_KEY,
        "country": "in",
        "language": "en",
        "category": "politics",
        "q": "(BJP OR Congress OR AAP OR RSS OR Parliament OR Election OR Supreme Court)",
        "removeduplicate": 1,
        "size": 10,
    }
    params2 = {
        "apikey": _settings.NEWSDATA_API_KEY,
        "country": "in",
        "language": "hi",
        "category": "politics",
        "q": "(BJP OR Congress OR AAP OR RSS OR Parliament OR Election OR Supreme Court)",
        "removeduplicate": 1,
        "size": 10,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response1, response2 = await asyncio.gather(client.get(url, params=params1), client.get(url, params=params2))
        data1 = response1.json()
        data2 = response2.json()
        token1 = data1.get("nextPage")
        token2 = data2.get("nextPage")
        params1["page"] = token1
        params2["page"] = token2
        response3, response4 = await asyncio.gather(client.get(url, params=params1), client.get(url, params=params2))
        data3 = response3.json()
        data4 = response4.json()
        english_news = data1["results"] + data3["results"]
        hindi_news = data2["results"] + data4["results"]
        await redis_client.set("english_news", json.dumps(english_news))
        await redis_client.set("hindi_news", json.dumps(hindi_news))

scheduler.add_job(
    fetch_news,
    trigger="interval",
    hours=6,
    id="daily_job",
    replace_existing=True,
)
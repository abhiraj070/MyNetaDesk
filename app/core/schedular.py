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
    url = "https://gnews.io/api/v4/search"
    params1 = {
        "apikey": _settings.NEWS_API_KEY,
        "q": '(BJP OR Congress OR AAP OR RSS OR Parliament OR Election OR "Supreme Court")',
        "lang": "en",
        "country": "in",
        "max": 10,
        "page": 1,
        "sortby": "publishedAt",
    }

    params2 = {
        "apikey": _settings.NEWS_API_KEY,
        "q": '(BJP OR Congress OR AAP OR RSS OR Parliament OR Election OR "Supreme Court")',
        "lang": "hi",
        "country": "in",
        "max": 10,
        "page": 1,
        "sortby": "publishedAt",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response1 = await client.get(url, params=params1)
        await asyncio.sleep(1.1)

        response2 = await client.get(url, params=params2)
        await asyncio.sleep(1.1)

        params1["page"] = 2
        response3 = await client.get(url, params=params1)
        await asyncio.sleep(1.1)

        params2["page"] = 2
        response4 = await client.get(url, params=params2)

        data1 = json.loads(response1.text)
        data2 = json.loads(response2.text)
        data3 = json.loads(response3.text)
        data4 = json.loads(response4.text)
        english_news = data1["articles"] + data3["articles"]
        hindi_news = data2["articles"] + data4["articles"]
        await redis_client.set("english_news", json.dumps(english_news))
        await redis_client.set("hindi_news", json.dumps(hindi_news))

scheduler.add_job(
    fetch_news,
    trigger="interval",
    hours=3,
    id="daily_job",
    replace_existing=True,
)
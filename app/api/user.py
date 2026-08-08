from urllib import request, response

from app.main import app
from app.schema import (LocationRequest, MinistrySearchRequest, UpdateMinistryRequest, UpdateMemberRequest,
                        GetMinisterRequest, GetMpRequest, GetCmRequest, UpdateCmRequest, TweetRequest,
                        FeedbackRequest, GetAssetsRequest)
from app.db.connect import get_db, engine
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, Query
from sqlalchemy import MetaData, Table, select, func, update
from sqlalchemy.exc import SQLAlchemyError
import httpx
import json
from app.config.settings import get_settings
from app.core.redis import redis_client
from app.db.model.feedback import Feedback
from app.core.schedular import fetch_news

_settings= get_settings()

metadata= MetaData()
mp= Table("mps", metadata, autoload_with= engine)
pc= Table("parliamentary_constituencies", metadata, autoload_with= engine)
manifesto= Table("party_manifesto_points", metadata, autoload_with=engine)
minister= Table("ministers", metadata, autoload_with= engine)
cm= Table("chief_ministers", metadata, autoload_with= engine)
politician= Table("politicians", metadata, autoload_with= engine)
wealth= Table("wealth_declarations", metadata, autoload_with= engine)
milestones= Table("political_milestones", metadata, autoload_with= engine)
count= Table("Count", metadata, autoload_with= engine)

HINDI = "hi"


def _localised(table, column_name, lang):
    column = table.c[column_name]
    if lang != HINDI:
        return column
    hindi = table.c.get(f"{column_name}_hindi")
    if hindi is None:
        return column
    return func.coalesce(hindi, column).label(column_name)


def cm_columns(lang, *names):
    return tuple(_localised(cm, n, lang) for n in names)


def minister_columns(lang, *names):
    return tuple(_localised(minister, n, lang) for n in names)


def milestone_columns(lang, *names):
    return tuple(_localised(milestones, n, lang) for n in names)

CM_NAME_EN = cm.c.name.label("name_en")
MINISTER_NAME_EN = minister.c.minister_name.label("minister_name_en")

@app.post("/get-location")
def get_location(request: LocationRequest, db: Session= Depends(get_db)):
    try:
        latitude= request.latitude
        longitude= request.longitude

        user_point= func.ST_SetSRID(
            func.ST_Point(longitude, latitude),
            4326
        )

        stmt= (select(mp.c.name, mp.c.party, mp.c.criminal_cases, mp.c.education, mp.c.photo_url, mp.c.slap_count, mp.c.rose_count, mp.c.constituency, mp.c.constituency_key, manifesto.c.points)
                .join(pc, (mp.c.constituency_key==pc.c.constituency_key) & (mp.c.state_key==pc.c.state_key))
                .join(manifesto, mp.c.party==manifesto.c.party)
                .where(func.ST_Contains(pc.c.geom, user_point))
        )

        final_mp= db.execute(stmt).mappings().first()
        stmt2= (update(count).where(count.c.id==123).values(cnt= count.c["cnt"]+1))
        db.execute(stmt2)
        db.commit()
        return {"mp": final_mp}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-minister")
def get_minister(request: MinistrySearchRequest, db: Session= Depends(get_db)):
    try:
        minister_name= request.name
        lang= request.lang
        stmt= select(
            *minister_columns(lang, "ministry", "minister_name", "party"),
            MINISTER_NAME_EN,
            minister.c.photo_url, minister.c.slap_count, minister.c.rose_count,
            *minister_columns(lang, "manifesto_points"),
        )

        if not minister_name:
            all_ministers= db.execute(stmt.order_by(minister.c.ministry)).mappings().all()
            return {"ministers": all_ministers}

        final_minister_details= db.execute(stmt.where(minister.c.minister_name==minister_name)).mappings().first()
        return {"minister_details": final_minister_details}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/get-leaderboard-mp")
def get_leaderboard_mp(offset:int= Query(0,ge=0,le=100), limit: int= Query(10,ge=1,le=100), db: Session= Depends(get_db)):
    try:
        cols= (mp.c.name, mp.c.party, mp.c.constituency, mp.c.constituency_key,
               mp.c.photo_url, mp.c.slap_count, mp.c.rose_count)
        slap_toppers= db.execute(
            select(*cols).order_by(mp.c.slap_count.desc(), mp.c.id.asc())
                         .limit(limit)
                         .offset(offset)
        ).mappings().all()
        rose_toppers= db.execute(
            select(*cols).order_by(mp.c.rose_count.desc(), mp.c.id.asc())
                         .limit(limit)
                         .offset(offset)

        ).mappings().all()
        print("res:",slap_toppers)
        return {"slap_toppers": slap_toppers, "rose_toppers": rose_toppers}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/get-leaderboard-minister")
def get_leaderboard_minister(limit:int= Query(10,ge=1,le=100), offset: int= Query(0,ge=0,le=100), lang: str= Query("en"), db: Session= Depends(get_db)):
    try:
        cols= (*minister_columns(lang, "minister_name", "party", "ministry"),
               MINISTER_NAME_EN,
               minister.c.photo_url, minister.c.slap_count, minister.c.rose_count)
        slap_toppers= db.execute(
            select(*cols).order_by(minister.c.slap_count.desc(), minister.c.id.asc())
                         .limit(limit)
                         .offset(offset)
        ).mappings().all()
        rose_toppers= db.execute(
            select(*cols).order_by(minister.c.rose_count.desc(), minister.c.id.asc())
                         .limit(limit)
                         .offset(offset)
        ).mappings().all()
        return {"slap_toppers": slap_toppers, "rose_toppers": rose_toppers}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.patch("/update-member-count")
def update_member_count(request: UpdateMemberRequest, db: Session= Depends(get_db)):
    try:
        table= request.table_to_update
        name= request.name_field_to_update
        constituency_key= request.constituency_key
        field= request.field_to_update

        if field not in ("slap_count","rose_count"):
            raise HTTPException(status_code=400, detail=f"Cannot update {field} field")

        member= table

        stmt= (update(member)
               .where((member.c.constituency_key==constituency_key) & (member.c.name==name))
               .values({field: member.c[field] + 1})
        )

        result= db.execute(stmt)
        db.commit()
        return {"rows_updated": result.rowcount}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.patch("/update-ministry-count")
def update_ministry_count(request: UpdateMinistryRequest, db: Session= Depends(get_db)):
    try:
        field= request.field_to_update
        name= request.name_field_to_update
        ministry_name= request.ministry_name
        if field not in ("slap_count", "rose_count"):
            raise HTTPException(status_code=400, detail=f"Cannot update {field} field")
        if field=="rose_count":
            today_count="rose_count_today" 
        else: 
            today_count= "slap_count_today" 
        member= minister
        stmt= (update(member)
                .where((member.c.ministry==ministry_name) & (member.c.minister_name==name))
                .values({
                    field: member.c[field]+1,
                    today_count: func.coalesce(member.c[today_count], 0)+1,
                })
        )

        result= db.execute(stmt)
        if result.rowcount == 0:
            db.rollback()
            raise HTTPException(
                status_code=404,
                detail="Minister not found"
            )
        db.commit()
        return {"rows_updated": result.rowcount}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-ministers-by-name")
def get_minister_by_name(request: GetMinisterRequest, db: Session= Depends(get_db)):
    try:
        name= request.name
        ministry= request.ministry
        stmt= (
            select(minister.c.ministry, minister.c.minister_name, minister.c.party,
                   minister.c.photo_url, minister.c.slap_count, minister.c.rose_count,
                   minister.c.manifesto_points)
            .where((minister.c.minister_name==name) & (minister.c.ministry==ministry))
        )
        minister_details= db.execute(stmt).mappings().first()
        return {"minister_details": minister_details}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-mps-by-name")
def get_mp_by_name(request: GetMpRequest, db: Session= Depends(get_db)):
    try:
        name= request.name
        constituency_key= request.constituency_key
        stmt= (
            select(mp.c.name, mp.c.party, mp.c.criminal_cases, mp.c.education,
                   mp.c.photo_url, mp.c.slap_count, mp.c.rose_count,
                   mp.c.constituency, mp.c.constituency_key, manifesto.c.points)
            .join(manifesto, mp.c.party==manifesto.c.party)
            .where((mp.c.name==name) & (mp.c.constituency_key==constituency_key))
        )
        mp_details= db.execute(stmt).mappings().first()
        return {"mp_details": mp_details}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-cm-location")
def get_cm_location(request: LocationRequest, db: Session= Depends(get_db)):
    try:
        latitude= request.latitude
        longitude= request.longitude
        lang= request.lang

        user_point= func.ST_SetSRID(
            func.ST_Point(longitude, latitude),
            4326
        )
        stmt= (select(
                    *cm_columns(lang, "name", "state"),
                    CM_NAME_EN,
                    cm.c.state_key, cm.c.party,
                    *cm_columns(lang, "designation"),
                    cm.c.photo_url, cm.c.slap_count, cm.c.rose_count,
                    *cm_columns(lang, "manifesto_points"),
                )
                .join(pc, cm.c.state_key==pc.c.state_key)
                .where(func.ST_Contains(pc.c.geom, user_point))
        )

        final_cm= db.execute(stmt).mappings().first()
        return {"cm": final_cm}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-cm")
def get_cm(request: GetCmRequest, db: Session= Depends(get_db)):
    try:
        state_key= request.state_key
        lang= request.lang
        stmt= select(
            *cm_columns(lang, "name", "state"),
            CM_NAME_EN,
            cm.c.state_key, cm.c.party,
            *cm_columns(lang, "designation"),
            cm.c.photo_url, cm.c.slap_count, cm.c.rose_count,
            *cm_columns(lang, "manifesto_points"),
        )

        if not state_key:
            all_cms= db.execute(stmt.order_by(cm.c.state)).mappings().all()
            return {"cms": all_cms}

        final_cm_details= db.execute(stmt.where(cm.c.state_key==state_key)).mappings().first()
        return {"cm_details": final_cm_details}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.get("/get-leaderboard-cm")
def get_leaderboard_cm(offset:int= Query(0,ge=0,le=100), limit: int= Query(10,ge=1,le=100), lang: str= Query("en"), db: Session= Depends(get_db)):
    try:
        cols= (*cm_columns(lang, "name", "state"), CM_NAME_EN,
               cm.c.state_key, cm.c.party,
               cm.c.photo_url, cm.c.slap_count, cm.c.rose_count)
        slap_toppers= db.execute(
            select(*cols).order_by(cm.c.slap_count.desc(), cm.c.id.asc())
                         .limit(limit)
                         .offset(offset)
        ).mappings().all()
        rose_toppers= db.execute(
            select(*cols).order_by(cm.c.rose_count.desc(), cm.c.id.asc())
                         .limit(limit)
                         .offset(offset)
        ).mappings().all()
        return {"slap_toppers": slap_toppers, "rose_toppers": rose_toppers}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.patch("/update-cm-count")
def update_cm_count(request: UpdateCmRequest, db: Session= Depends(get_db)):
    try:
        field= request.field_to_update
        name= request.name_field_to_update
        state_key= request.state_key
        if field not in ("slap_count", "rose_count"):
            raise HTTPException(status_code=400, detail=f"Cannot update {field} field")

        if field=="rose_count": 
            today_count="rose_count_today" 
        else: 
            today_count= "slap_count_today" 
        stmt= (update(cm)
                .where((cm.c.state_key==state_key) & (cm.c.name==name))
                .values({
                    field: cm.c[field]+1,
                    today_count: func.coalesce(cm.c[today_count], 0)+1,
                })
        )

        result= db.execute(stmt)
        db.commit()
        return {"rows_updated": result.rowcount}
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

def _highlight(db, cm_count, minister_count, key, lang="en"):
    top_cm = db.execute(
        select(
            *cm_columns(lang, "name", "state"),
            CM_NAME_EN,
            cm.c.state_key,
            cm.c.party,
            cm.c.photo_url,
            cm.c.slap_count,
            cm.c.rose_count,
            cm_count.label("count"),
        )
        .where(cm_count > 0)
        .order_by(cm_count.desc(), cm.c.id.asc())
        .limit(1)
    ).mappings().first()

    top_minister = db.execute(
        select(
            *minister_columns(lang, "minister_name", "party", "ministry"),
            MINISTER_NAME_EN,
            minister.c.photo_url,
            minister.c.slap_count,
            minister.c.rose_count,
            minister_count.label("count"),
        )
        .where(minister_count > 0)
        .order_by(minister_count.desc(), minister.c.id.asc())
        .limit(1)
    ).mappings().first()

    if top_cm is None and top_minister is None:
        return {key: None}
    if top_minister is None:
        winner, tier = top_cm, "cm"
    elif top_cm is None:
        winner, tier = top_minister, "minister"
    elif top_cm["count"] >= top_minister["count"]:
        winner, tier = top_cm, "cm"
    else:
        winner, tier = top_minister, "minister"

    return {key: {**dict(winner), "tier": tier}}


def _highlight_route(db, cm_count, minister_count, key, lang="en"):
    try:
        return _highlight(db, cm_count, minister_count, key, lang)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

def _today(column):
    return func.coalesce(column, 0)


@app.get("/most-slapped")
def get_most_slapped(lang: str = Query("en"), db: Session = Depends(get_db)):
    return _highlight_route(
        db,
        _today(cm.c.slap_count_today),
        _today(minister.c.slap_count_today),
        "most_slapped",
        lang,
    )


@app.get("/most-roasted")
def get_most_roasted(lang: str = Query("en"), db: Session = Depends(get_db)):
    return _highlight_route(
        db,
        _today(cm.c.rose_count_today),
        _today(minister.c.rose_count_today),
        "most_roasted",
        lang,
    )


@app.get("/most-judged")
def get_most_judged(lang: str = Query("en"), db: Session = Depends(get_db)):
    return _highlight_route(
        db,
        _today(cm.c.slap_count_today) + _today(cm.c.rose_count_today),
        _today(minister.c.slap_count_today) + _today(minister.c.rose_count_today),
        "most_judged",
        lang,
    )

@app.post("/tweets")
async def get_tweets(request: TweetRequest, db: Session= Depends(get_db)):
    table= request.table
    name= request.name
    if table == "chief_ministers":
        username= db.execute((select(cm.c.x_username).where(cm.c.name==name))).scalar()
    else:
        username= db.execute((select(minister.c.x_username).where(minister.c.minister_name==name))).scalar()

    if not username:
        return {"top_tweets": {}}

    BEARER_TOKEN= _settings.BEARER_TOKEN_X
    URL="https://api.x.com/2/tweets/search/recent"
    headers={"Authorization": f"Bearer {BEARER_TOKEN}"}
    params = {
        "query": f"@{username} -is:retweet",
        "sort_order": "relevancy",
        "max_results": 10,

        "tweet.fields": (
            "created_at,"
            "public_metrics,"
            "author_id,"
            "attachments,"
            "referenced_tweets"
        ),

        "expansions": (
            "author_id,"
            "attachments.media_keys,"
            "referenced_tweets.id,"
            "referenced_tweets.id.author_id"
        ),

        "user.fields": (
            "id,"
            "name,"
            "username,"
            "profile_image_url,"
            "verified,"
            "verified_type"
        ),

        "media.fields": (
            "media_key,"
            "type,"
            "url,"
            "preview_image_url,"
            "width,"
            "height,"
            "alt_text"
        ),
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response= await client.get(
            URL,
            headers= headers,
            params= params
        )
    data= response.json()
    return {"top_tweets": data}
    
@app.post("/feedback")
def feedback(request: FeedbackRequest, db: Session= Depends(get_db)):
    reaction= request.reaction
    if reaction not in ("SLAP", "ROSE"):
        raise HTTPException(status_code=400, detail="reaction must be 'SLAP' or 'ROSE'")
    try:
        entry= Feedback(message=request.message, reaction=reaction)
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return {"ok": True, "id": entry.id}
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/get-assets")
def get_assets(request: GetAssetsRequest, db: Session = Depends(get_db)):
    try:
        name= request.name
        designation= request.designation
        stmt1= (select(politician.c.id).where((politician.c.canonical_name==name) & (politician.c.subject_type==designation)))
        pol_id= db.execute(stmt1).scalar()
        stmt2= (select(wealth.c.election_year, wealth.c.election_name, wealth.c.source_url, wealth.c.total_assets,
                       wealth.c.total_liabilities, wealth.c.movable_assets, wealth.c.immovable_assets, wealth.c.cash,
                       wealth.c.bank_deposits, wealth.c.shares_investments, wealth.c.mutual_funds, wealth.c.jewellery,
                       wealth.c.vehicles, wealth.c.residential_property, wealth.c.commercial_property, wealth.c.agricultural_land,
                       wealth.c.other_assets).where(wealth.c.politician_id==pol_id))
        result= db.execute(stmt2).mappings().all()
        return {"top_assets": result}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.post("/get-timeline")
def det_timeline(request: GetAssetsRequest, db: Session = Depends(get_db)):
    try:
        name= request.name
        designation= request.designation
        lang= request.lang
        stmt1= (select(milestones.c.year, milestones.c.start_date, milestones.c.end_date,
                    *milestone_columns(lang, "position_title"),
                    milestones.c.position_rank, milestones.c.party, milestones.c.entry_mode, milestones.c.is_current,
                    milestones.c.sources, wealth.c.total_assets)
                    .join(politician, politician.c.id == milestones.c.politician_id)
                    .outerjoin(wealth, wealth.c.milestone_id == milestones.c.id)
                    .where((politician.c.subject_type==designation) & (politician.c.canonical_name==name)))
        timeline= db.execute(stmt1).mappings().all()
        return {"timeline": timeline}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@app.get("/get-news")
async def get_news(lang: str = "en"):
    try:
        key= "hindi_news" if lang == HINDI else "english_news"
        res= await redis_client.get(key)
        return {"news": json.loads(res) if res else []}
    except json.JSONDecodeError:
        return {"news": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/redis-test")
async def redis_test():
    await redis_client.set("test", "Hello Redis")
    value = await redis_client.get("test")
    return {
        "connected": True,
        "value": value
    }

@app.get("/redis-test-news")
async def redis_test_news():
    await fetch_news()
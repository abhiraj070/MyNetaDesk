from app.main import app
from app.schema import LocationRequest, MinistrySearchRequest, UpdateMinistryRequest, UpdateMemberRequest, GetMinisterRequest, GetMpRequest, GetCmRequest, UpdateCmRequest
from app.db.connect import get_db, engine
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, Query
from sqlalchemy import MetaData, Table, select, func, update
from sqlalchemy.exc import SQLAlchemyError

metadata= MetaData()
mp= Table("mps", metadata, autoload_with= engine)
pc= Table("parliamentary_constituencies", metadata, autoload_with= engine)
manifesto= Table("party_manifesto_points", metadata, autoload_with=engine)
minister= Table("ministers", metadata, autoload_with= engine)
cm= Table("chief_ministers", metadata, autoload_with= engine)

MEMBER_TABLES= {"mps": mp}


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
        return {"mp": final_mp}
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@app.post("/get-minister")
def get_minister(request: MinistrySearchRequest, db: Session= Depends(get_db)):
    try:
        minister_name= request.name
        stmt= select(minister.c.ministry, minister.c.minister_name, minister.c.party, minister.c.photo_url, minister.c.slap_count, minister.c.rose_count, minister.c.manifesto_points)

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
def get_leaderboard_minister(limit:int= Query(10,ge=1,le=100), offset: int= Query(0,ge=0,le=100),db: Session= Depends(get_db)):
    try:
        cols= (minister.c.minister_name, minister.c.party, minister.c.ministry,
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

        if table not in MEMBER_TABLES:
            raise HTTPException(status_code=400, detail=f"Cannot update {table} table")

        member= MEMBER_TABLES[table]

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

        # `COALESCE` on the daily counter: the `_today` columns were added
        # without a default, so existing rows hold NULL — and `NULL + 1` is
        # NULL, which would silently swallow every vote's daily tally while the
        # lifetime count moved. This makes the first vote on an untouched row
        # write 1 instead of nothing.
        stmt= (update(member)
                .where((member.c.ministry==ministry_name) & (member.c.minister_name==name))
                .values({
                    field: member.c[field]+1,
                    today_count: func.coalesce(member.c[today_count], 0)+1,
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

        user_point= func.ST_SetSRID(
            func.ST_Point(longitude, latitude),
            4326
        )
        stmt= (select(cm.c.name, cm.c.state, cm.c.state_key, cm.c.party, cm.c.designation, cm.c.photo_url, cm.c.slap_count, cm.c.rose_count, cm.c.manifesto_points)
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
        stmt= select(cm.c.name, cm.c.state, cm.c.state_key, cm.c.party, cm.c.designation, cm.c.photo_url, cm.c.slap_count, cm.c.rose_count, cm.c.manifesto_points)

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
def get_leaderboard_cm(offset:int= Query(0,ge=0,le=100), limit: int= Query(10,ge=1,le=100), db: Session= Depends(get_db)):
    try:
        cols= (cm.c.name, cm.c.state, cm.c.state_key, cm.c.party,
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
        # See the note in `update_ministry_count`: the `_today` columns can hold
        # NULL, and `NULL + 1` would drop the vote from the daily tally.
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


HIGHLIGHT_TIEBREAK_NOTE = """
The three highlight endpoints all answer the same question for a different
counter: who is top of the pile *today*.

They read the `_today` columns rather than the lifetime `slap_count` /
`rose_count`, because that is what the section they feed is called and what the
daily reset in `app.tasks.daily_reset` maintains. Rows whose counter is still
zero are excluded, so "nobody has been slapped yet today" comes back as an
explicit null instead of an arbitrary row with a count of 0.
"""


def _highlight(db, cm_count, minister_count, key):
    """
    Returns whichever of the two tiers holds the larger count, as
    `{key: row | None}`.

    A null payload with 200 is the correct answer for an empty or all-zero
    table — it is a "nothing to show yet" state, not a failure — so the caller
    can render an empty state rather than an error. Genuine database problems
    still raise.
    """
    top_cm = db.execute(
        select(
            cm.c.name,
            cm.c.state,
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
            minister.c.minister_name,
            minister.c.party,
            minister.c.ministry,
            minister.c.photo_url,
            minister.c.slap_count,
            minister.c.rose_count,
            minister_count.label("count"),
        )
        .where(minister_count > 0)
        .order_by(minister_count.desc(), minister.c.id.asc())
        .limit(1)
    ).mappings().first()

    # Either side may legitimately be missing, so every comparison below has to
    # tolerate None rather than assuming both tiers have a row.
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


def _highlight_route(db, cm_count, minister_count, key):
    """Shared error envelope for the three highlight endpoints."""
    try:
        return _highlight(db, cm_count, minister_count, key)
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# The `_today` columns are nullable, so every read of them is wrapped: an
# un-voted row holds NULL, and both `NULL > 0` and `NULL + NULL` are NULL,
# which would quietly drop those rows out of the ranking and out of the sum.
def _today(column):
    return func.coalesce(column, 0)


@app.get("/most-slapped")
def get_most_slapped(db: Session = Depends(get_db)):
    return _highlight_route(
        db,
        _today(cm.c.slap_count_today),
        _today(minister.c.slap_count_today),
        "most_slapped",
    )


@app.get("/most-roasted")
def get_most_roasted(db: Session = Depends(get_db)):
    return _highlight_route(
        db,
        _today(cm.c.rose_count_today),
        _today(minister.c.rose_count_today),
        "most_roasted",
    )


@app.get("/most-judged")
def get_most_judged(db: Session = Depends(get_db)):
    return _highlight_route(
        db,
        _today(cm.c.slap_count_today) + _today(cm.c.rose_count_today),
        _today(minister.c.slap_count_today) + _today(minister.c.rose_count_today),
        "most_judged",
    )

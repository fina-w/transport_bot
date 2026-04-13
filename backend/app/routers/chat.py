import re

from fastapi import APIRouter, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field

from app.db import fetch_all
from app.llm import generate_sql_and_answer
from app.sql_guard import validate_select_only

router = APIRouter(prefix="/api", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    answer: str
    sql: str
    rows: list[dict]
    columns: list[str]


def _apply_row_cap(sql: str, cap: int = 150) -> str:
    s = sql.rstrip().rstrip(";").strip()
    if re.search(r"\bLIMIT\s+\d+\b", s, re.IGNORECASE):
        return s
    return f"{s} LIMIT {cap}"


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    try:
        raw_sql, answer = await generate_sql_and_answer(req.message)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur LLM: {e!s}") from e

    ok, msg_or_sql = validate_select_only(raw_sql)
    if not ok:
        raise HTTPException(status_code=400, detail=msg_or_sql)

    safe_sql = _apply_row_cap(msg_or_sql)
    try:
        rows = fetch_all(safe_sql)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Exécution SQL refusée ou erreur: {e!s}",
        ) from e

    columns = list(rows[0].keys()) if rows else []
    return ChatResponse(
        answer=answer,
        sql=safe_sql,
        rows=jsonable_encoder(rows),
        columns=columns,
    )

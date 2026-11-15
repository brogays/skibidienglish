from __future__ import annotations

import json
import logging
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

import firebase_admin
import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import auth as firebase_auth
from firebase_admin import firestore
from pydantic import BaseModel, Field

if not firebase_admin._apps:
    firebase_admin.initialize_app()

db = firestore.client()
app = FastAPI(title="Lingua Quest learning API", docs_url=None, redoc_url=None)
allowed_origins = [
    origin.strip()
    for origin in os.getenv("WEB_ORIGINS", "https://brogays.github.io").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
logger = logging.getLogger(__name__)
WORD_ID = re.compile(r"^[a-z][a-z '-]{0,39}$", re.IGNORECASE)
REVIEW_DELAY = timedelta(hours=12)
UTC = timezone.utc


class WordInput(BaseModel):
    word: str = Field(min_length=1, max_length=40)
    meaning: str = Field(default="", max_length=240)
    example: str = Field(default="", max_length=500)
    topic: str = Field(default="", max_length=60)


class EventInput(BaseModel):
    event_type: Literal["study", "word_learned", "word_reviewed", "mission_completed"]
    word: WordInput | None = None
    mission_id: str | None = Field(default=None, max_length=80)
    local_date: str = Field(min_length=10, max_length=10)
    minutes: int = Field(default=1, ge=0, le=1)


class MigrationInput(BaseModel):
    words: list[WordInput] = Field(default_factory=list, max_length=400)


async def authenticated_uid(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Vui lòng đăng nhập.")
    token = authorization.removeprefix("Bearer ").strip()
    try:
        decoded = firebase_auth.verify_id_token(token, check_revoked=True)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập không hợp lệ.") from error
    return str(decoded["uid"])


def user_ref(uid: str):
    return db.collection("users").document(uid)


def validate_local_date(value: str) -> str:
    try:
        local_day = date.fromisoformat(value)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Ngày hoạt động không hợp lệ.") from error
    today = datetime.now(UTC).date()
    if abs((local_day - today).days) > 1:
        raise HTTPException(status_code=422, detail="Ngày hoạt động nằm ngoài khoảng cho phép.")
    return value


def normalized_word(value: str) -> str:
    word = value.strip().lower()
    if not WORD_ID.fullmatch(word):
        raise HTTPException(status_code=422, detail="Từ vựng chứa ký tự không hợp lệ.")
    return word


def streak_from_days(days: list[str], today: date) -> int:
    activity_days = set(days)
    cursor = today if today.isoformat() in activity_days else today - timedelta(days=1)
    streak = 0
    while cursor.isoformat() in activity_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


async def create_missions(stats: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return {
            "source": "not_configured",
            "message": "AI chưa được bật. Thêm GEMINI_API_KEY vào Cloud Run để tạo nhiệm vụ cá nhân hóa.",
            "items": [
                {"id": "review-due", "title": f"Ôn lại {stats['dueCount']} từ đang đến hạn", "detail": "Ôn từ đã học ít nhất 12 giờ trước."},
                {"id": "learn-5", "title": "Học 5 từ mới", "detail": "Chọn một chủ đề trong kho từ vựng."},
                {"id": "study-15", "title": "Học tập trung 15 phút", "detail": "Chia thời gian cho từ vựng và ngữ pháp."},
            ],
        }

    prompt = (
        "Tạo đúng 3 nhiệm vụ học tiếng Anh ngắn, cụ thể bằng tiếng Việt cho hôm nay. "
        "Chỉ trả JSON dạng {\"items\":[{\"id\":\"...\",\"title\":\"...\",\"detail\":\"...\"}]}. "
        "Dùng thống kê học tập cá nhân sau đây, không thêm nội dung ngoài JSON: "
        + json.dumps(
            {
                "learnedCount": stats["learnedCount"],
                "dueCount": stats["dueCount"],
                "streak": stats["streak"],
                "dueWords": [item["word"] for item in stats["dueWords"][:10]],
            },
            ensure_ascii=False,
        )
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash:generateContent"
    )
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                url,
                headers={"x-goog-api-key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"responseMimeType": "application/json"},
                },
            )
            response.raise_for_status()
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text)
            items = parsed.get("items")
            if not isinstance(items, list) or len(items) != 3:
                raise ValueError("AI returned an invalid mission list.")
            cleaned = []
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    raise ValueError("AI returned an invalid mission.")
                cleaned.append(
                    {
                        "id": f"ai-{index + 1}",
                        "title": str(item.get("title", ""))[:100],
                        "detail": str(item.get("detail", ""))[:240],
                    }
                )
                if not cleaned[-1]["title"]:
                    raise ValueError("AI returned an empty mission title.")
            return {"source": "gemini", "message": "Nhiệm vụ được AI cá nhân hóa từ tiến độ học của bạn.", "items": cleaned}
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError):
        logger.exception("Gemini failed to generate learning missions.")
        return {
            "source": "error",
            "message": "Không tạo được nhiệm vụ AI lúc này. Thử tải lại sau.",
            "items": [],
        }


@app.get("/api/v1/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/migrate")
async def migrate_legacy_data(payload: MigrationInput, uid: str = Depends(authenticated_uid)) -> dict[str, int]:
    root = user_ref(uid)
    marker = root.collection("learning").document("migration-v1")
    if marker.get().exists:
        return {"imported": 0}

    now = datetime.now(UTC)
    batch = db.batch()
    imported = 0
    for item in payload.words:
        word = normalized_word(item.word)
        ref = root.collection("vocabulary").document(word)
        if not ref.get().exists:
            batch.set(
                ref,
                {
                    "word": word,
                    "meaning": item.meaning.strip(),
                    "example": item.example.strip(),
                    "topic": item.topic.strip(),
                    "firstLearnedAt": now,
                    "lastLearnedAt": now,
                    "dueAt": now + REVIEW_DELAY,
                    "reviewCount": 0,
                    "source": "legacy-import",
                },
            )
            imported += 1
        if imported and imported % 400 == 0:
            batch.commit()
            batch = db.batch()
    batch.set(marker, {"completedAt": now, "imported": imported})
    batch.commit()
    return {"imported": imported}


@app.post("/api/v1/events")
async def record_event(payload: EventInput, uid: str = Depends(authenticated_uid)) -> dict[str, bool]:
    local_day = validate_local_date(payload.local_date)
    root = user_ref(uid)
    now = datetime.now(UTC)
    daily_ref = root.collection("studyDays").document(local_day)
    if payload.event_type == "study":
        daily_ref.set(
            {"date": local_day, "minutes": firestore.Increment(payload.minutes), "updatedAt": now},
            merge=True,
        )
    elif payload.event_type in ("word_learned", "word_reviewed"):
        if payload.word is None:
            raise HTTPException(status_code=422, detail="Thiếu từ vựng cho sự kiện học.")
        word = normalized_word(payload.word.word)
        word_ref = root.collection("vocabulary").document(word)
        previous = word_ref.get()
        data: dict[str, Any] = {
            "word": word,
            "meaning": payload.word.meaning.strip(),
            "example": payload.word.example.strip(),
            "topic": payload.word.topic.strip(),
            "lastLearnedAt": now,
            "dueAt": now + REVIEW_DELAY,
        }
        if previous.exists:
            data["firstLearnedAt"] = previous.get("firstLearnedAt")
            data["reviewCount"] = (
                firestore.Increment(1)
                if payload.event_type == "word_reviewed"
                else previous.get("reviewCount", 0)
            )
        else:
            data["firstLearnedAt"] = now
            data["reviewCount"] = 0
        word_ref.set(data, merge=True)
        daily_ref.set(
            {"date": local_day, "wordsStudied": firestore.Increment(1), "updatedAt": now},
            merge=True,
        )
    elif payload.event_type == "mission_completed":
        if not payload.mission_id or not re.fullmatch(r"[a-zA-Z0-9_-]{1,80}", payload.mission_id):
            raise HTTPException(status_code=422, detail="Mã nhiệm vụ không hợp lệ.")
        root.collection("dailyMissions").document(local_day).set(
            {"completed": firestore.ArrayUnion([payload.mission_id]), "updatedAt": now},
            merge=True,
        )
    return {"saved": True}


@app.get("/api/v1/dashboard")
async def dashboard(
    local_date: str = Query(..., min_length=10, max_length=10),
    uid: str = Depends(authenticated_uid),
) -> dict[str, Any]:
    root = user_ref(uid)
    now = datetime.now(UTC)
    today_key = validate_local_date(local_date)
    today = date.fromisoformat(today_key)
    vocabulary = list(root.collection("vocabulary").limit(1000).stream())
    learned = [doc.to_dict() or {} for doc in vocabulary]
    due = [
        {
            "word": item.get("word", ""),
            "meaning": item.get("meaning", ""),
            "topic": item.get("topic", ""),
            "dueAt": item.get("dueAt").isoformat() if item.get("dueAt") else None,
        }
        for item in learned
        if item.get("dueAt") and item["dueAt"] <= now
    ]
    due.sort(key=lambda item: item["dueAt"] or "")

    day_docs = list(root.collection("studyDays").order_by("date", direction=firestore.Query.DESCENDING).limit(400).stream())
    day_data = [doc.to_dict() or {} for doc in day_docs]
    day_keys = [str(item.get("date", "")) for item in day_data]
    streak = streak_from_days(day_keys, today)
    today_doc = root.collection("studyDays").document(today_key).get()
    today_minutes = int((today_doc.to_dict() or {}).get("minutes", 0))
    week_start = today - timedelta(days=today.weekday())
    week_minutes = sum(
        int(item.get("minutes", 0))
        for item in day_data
        if item.get("date") and date.fromisoformat(item["date"]) >= week_start
    )
    stats: dict[str, Any] = {
        "learnedCount": len(learned),
        "dueCount": len(due),
        "dueWords": due[:30],
        "streak": streak,
        "todayMinutes": today_minutes,
        "weekMinutes": week_minutes,
    }

    missions_ref = root.collection("dailyMissions").document(today_key)
    saved_missions = missions_ref.get()
    saved_data = saved_missions.to_dict() or {} if saved_missions.exists else {}
    api_key_is_configured = bool(os.getenv("GEMINI_API_KEY", "").strip())
    if saved_data.get("source") == "gemini" or (
        saved_data.get("source") == "not_configured" and not api_key_is_configured
    ):
        missions = saved_data
    else:
        missions = await create_missions(stats)
        missions["completed"] = list(saved_data.get("completed", []))
        missions["createdAt"] = now
        if missions["source"] in ("gemini", "not_configured"):
            missions_ref.set(missions)
    missions["completed"] = list(missions.get("completed", []))
    return {**stats, "dueWords": due[:10], "missions": missions}
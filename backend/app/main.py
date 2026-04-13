from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import chat, data

app = FastAPI(title="Transport Demo API", version="1.0.0")

s = get_settings()
origins = [o.strip() for o in s.cors_origins.split(",") if o.strip()]
if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(data.router)
app.include_router(chat.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}


_backend_root = Path(__file__).resolve().parent.parent
_frontend = _backend_root / "frontend"
if not _frontend.is_dir():
    _frontend = _backend_root.parent / "frontend"
if _frontend.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="static")

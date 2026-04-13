import os
from functools import lru_cache
from urllib.parse import unquote, urlparse

from dotenv import load_dotenv

load_dotenv()
#that's it


def _parse_mysql_url(url: str) -> dict[str, str | int]:
    """Extrait host, port, user, password, database depuis une URL mysql:// ou mysql+pymysql://."""
    u = url.strip()
    for prefix in ("mysql+pymysql://", "mysql+aiomysql://", "mysql2://", "mysql://"):
        if u.startswith(prefix):
            u = "mysql://" + u.split("://", 1)[1]
            break
    p = urlparse(u)
    if p.scheme != "mysql" or not p.hostname:
        raise ValueError("URL MySQL invalide")
    db = (p.path or "/").lstrip("/").split("?")[0]
    return {
        "host": p.hostname,
        "port": p.port or 3306,
        "user": unquote(p.username or ""),
        "password": unquote(p.password or ""),
        "database": db,
    }


class Settings:
    def __init__(self) -> None:
        parsed: dict[str, str | int] | None = None
        for key in ("DATABASE_URL", "MYSQL_URL"):
            raw = os.getenv(key)
            if not raw:
                continue
            low = raw.lower()
            if "mysql" not in low.split(":", 1)[0]:
                continue
            try:
                parsed = _parse_mysql_url(raw)
                break
            except ValueError:
                continue

        if parsed:
            self.mysql_host = str(parsed["host"])
            self.mysql_port = int(parsed["port"])
            self.mysql_user = str(parsed["user"])
            self.mysql_password = str(parsed["password"])
            self.mysql_database = str(parsed["database"])
        else:
            # On cherche d'abord la variable Railway, sinon la variable locale, sinon 127.0.0.1
            self.mysql_host = os.getenv("MYSQLHOST") or os.getenv("MYSQL_HOST", "127.0.0.1")
            self.mysql_port = int(os.getenv("MYSQLPORT") or os.getenv("MYSQL_PORT", "3306"))
            self.mysql_user = os.getenv("MYSQLUSER") or os.getenv("MYSQL_USER", "root")
            self.mysql_password = os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_PASSWORD", "")
            self.mysql_database = os.getenv("MYSQLDATABASE") or os.getenv("MYSQL_DATABASE", "transport_demo")

        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        #self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        #self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2")

        self.cors_origins = os.getenv("CORS_ORIGINS", "*")


@lru_cache
def get_settings() -> Settings:
    return Settings()

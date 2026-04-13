import pymysql
from pymysql.cursors import DictCursor

from app.config import get_settings


def get_connection():
    s = get_settings()
    return pymysql.connect(
        host=s.mysql_host,
        port=s.mysql_port,
        user=s.mysql_user,
        password=s.mysql_password,
        database=s.mysql_database,
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=True,
    )


def fetch_all(sql: str, params: tuple | None = None) -> list[dict]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return list(cur.fetchall())
    finally:
        conn.close()

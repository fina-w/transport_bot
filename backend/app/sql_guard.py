import re

_FORBIDDEN = re.compile(
    r"\b("
    r"INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|REPLACE|"
    r"GRANT|REVOKE|CALL|EXEC|EXECUTE|MERGE|ATTACH|DETACH|PRAGMA|VACUUM|"
    r"COPY|BULK|SHUTDOWN|KILL|OUTFILE|INFILE|LOAD_FILE"
    r")\b",
    re.IGNORECASE,
)


def validate_select_only(sql: str) -> tuple[bool, str]:
    raw = (sql or "").strip()
    if not raw:
        return False, "Requête SQL vide."

    cleaned = raw.rstrip().rstrip(";").strip()
    if "--" in cleaned or "/*" in cleaned:
        return False, "Les commentaires SQL ne sont pas autorisés."

    upper = cleaned.upper()
    if not upper.startswith("SELECT"):
        return False, "Seules les requêtes SELECT sont autorisées."

    if ";" in cleaned:
        return False, "Une seule instruction SQL est autorisée."

    if _FORBIDDEN.search(cleaned):
        return False, "Mots-clés interdits détectés dans la requête."

    return True, cleaned

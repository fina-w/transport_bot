import json

import httpx
from openai import OpenAI

from app.config import get_settings

SCHEMA_PROMPT = """
Tu es un assistant SQL pour une base MySQL nommée transport_demo.

Tables (utilise exactement ces noms et colonnes) :

vehicules(
  id INT PK,
  immatriculation VARCHAR,
  marque VARCHAR,
  modele VARCHAR,
  type_vehicule ENUM('bus','minibus','camion','utilitaire'),
  capacite_places INT,
  statut ENUM('actif','maintenance','hors_service')
)

chauffeurs(
  id INT PK,
  nom VARCHAR,
  prenom VARCHAR,
  numero_permis VARCHAR,
  telephone VARCHAR,
  statut ENUM('disponible','en_route','conge','indisponible')
)

lignes(
  id INT PK,
  code VARCHAR,
  nom VARCHAR,
  origine VARCHAR,
  destination VARCHAR,
  distance_km DECIMAL,
  duree_minutes INT
)

trajets(
  id INT PK,
  vehicule_id INT FK -> vehicules.id,
  chauffeur_id INT FK -> chauffeurs.id,
  origine VARCHAR,
  destination VARCHAR,
  date_depart DATETIME,
  date_arrivee_prevue DATETIME,
  statut ENUM('planifie','en_cours','termine','annule')
)

tarifs(
  id INT PK,
  ligne_id INT FK -> lignes.id,
  type_client ENUM('normal','etudiant','senior'),
  prix DECIMAL
)

incidents(
  id INT PK,
  trajet_id INT FK -> trajets.id,
  description TEXT,
  gravite ENUM('faible','moyenne','elevee','critique'),
  date_incident DATETIME
)

Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte autour.
- Clés : "sql" (string, une seule requête SELECT MySQL), "answer" (string, réponse courte en français pour l'utilisateur).
- Pas de point-virgule dans le SQL ; pas de commentaires ; pas de LIMIT sauf si l'utilisateur demande explicitement de limiter (sinon tu peux ajouter LIMIT 100 pour les listes longues).
- Jointures autorisées. Pas de sous-requêtes destructrices ; uniquement lecture.
"""


def _extract_json_object(text: str) -> dict:
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


async def generate_sql_and_answer(user_question: str) -> tuple[str, str]:
    s = get_settings()
    user_content = f"Question utilisateur : {user_question.strip()}"

    if s.openai_api_key:
        client = OpenAI(api_key=s.openai_api_key,
        base_url="https://api.groq.com/openai/v1")
        resp = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SCHEMA_PROMPT.strip()},
                {"role": "user", "content": user_content},
            ],
            temperature=0.1,
        )
        raw = resp.choices[0].message.content or ""
    else:
        url = f"{s.ollama_base_url.rstrip('/')}/api/chat"
        try:
            async with httpx.AsyncClient(timeout=120.0) as client_http:
                r = await client_http.post(
                    url,
                    json={
                        "model": s.ollama_model,
                        "messages": [
                            {"role": "system", "content": SCHEMA_PROMPT.strip()},
                            {"role": "user", "content": user_content},
                        ],
                        "stream": False,
                        "options": {"temperature": 0.1},
                    },
                )
                r.raise_for_status()
                data = r.json()
                raw = (data.get("message") or {}).get("content") or ""
        except httpx.ConnectError as e:
            raise RuntimeError(
                f"Ollama injoignable ({url}). Démarrez Ollama et exécutez "
                f"`ollama pull {s.ollama_model}`, ou renseignez OPENAI_API_KEY dans backend/.env."
            ) from e

    parsed = _extract_json_object(raw)
    sql = str(parsed.get("sql", "")).strip()
    answer = str(parsed.get("answer", "")).strip()
    if not sql:
        raise ValueError("Le modèle n'a pas renvoyé de champ sql valide.")
    return sql, answer or "Voici les résultats."

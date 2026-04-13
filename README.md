# Application web transport (données + assistant SQL)

Affichage des véhicules, chauffeurs, trajets et incidents ; onglet **Assistant SQL** pour poser des questions en langage naturel. Le modèle génère uniquement des requêtes **SELECT** ; le backend valide et exécute sur MySQL.

## Prérequis

- Python 3.11+
- MySQL 8+
- **OpenAI** (clé API) **ou** **Ollama** en local avec un modèle chat (ex. `llama3.2`)

## Base de données

```bash
mysql -u root -p < backend/schema.sql
```

Puis copiez `backend/.env.example` vers `backend/.env` et renseignez `MYSQL_*` (et `OPENAI_API_KEY` ou Ollama).

## Lancer en local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Ouvrez `http://127.0.0.1:8000/` : l’API sert aussi le frontend statique.

## Déploiement (Render / Railway)

1. Créez une base **MySQL** managée (ou service MySQL).
2. Déployez ce dépôt avec **répertoire racine** = `backend` (ou utilisez le `Dockerfile` à la racine).
3. Variables d’environnement : `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, et `OPENAI_API_KEY` (recommandé en prod) ou paramètres Ollama si votre hébergeur permet d’atteindre Ollama.
4. Commande de démarrage : `uvicorn app.main:app --host 0.0.0.0 --port $PORT`  
   Sous Windows sur certains hébergeurs, utilisez la variable `PORT` fournie par la plateforme.

Pour le frontend : les fichiers dans `frontend/` sont servis par FastAPI depuis le dossier parent du module `app` ; en build Docker, le `Dockerfile` copie `frontend` au bon endroit.

## API

| Méthode | Chemin | Description |
|--------|--------|-------------|
| GET | `/api/health` | Santé |
| GET | `/api/vehicules` | Liste véhicules |
| GET | `/api/chauffeurs` | Liste chauffeurs |
| GET | `/api/trajets` | Liste trajets |
| GET | `/api/incidents` | Liste incidents |
| POST | `/api/chat` | Body JSON `{"message":"..."}` → réponse + SQL + lignes |

## Sécurité

- Validation stricte : une seule instruction, **SELECT** uniquement, mots-clés dangereux refusés.
- Limite automatique **150** lignes si la requête n’a pas de `LIMIT`.

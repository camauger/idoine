# Backend API – Atelier St-Elme

API légère (FastAPI + SQLAlchemy) pour les cours et les inscriptions.

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Base de données

- **Développement** : SQLite (`atelier_cours.db` créé dans le répertoire courant).
- **Production** : définir `DATABASE_URL` (ex. PostgreSQL sur [Neon](https://neon.tech)).

## Premier lancement

```bash
# Créer les tables et charger les cours (horaire Printemps 2026 + intensifs)
python seed_courses.py

# Démarrer l’API
uvicorn main:app --reload
```

- API : http://127.0.0.1:8000  
- Docs : http://127.0.0.1:8000/docs  
- Admin : http://127.0.0.1:8000/admin (mot de passe : variable d’environnement `ADMIN_PASSWORD`, défaut `admin`)

## Variables d’environnement

| Variable          | Description                          | Défaut        |
|-------------------|--------------------------------------|---------------|
| `DATABASE_URL`    | URL de la base (PostgreSQL en prod) | SQLite local  |
| `SECRET_KEY`      | Clé pour les JWT admin               | change-me…    |
| `ADMIN_PASSWORD`  | Mot de passe admin                   | admin         |
| `CORS_ORIGINS`    | Origines autorisées (séparées par ,) | localhost     |

## Intégration au site (Netlify)

Sur le site statique, définir l’URL de l’API pour activer les appels temps réel et l’envoi du formulaire vers l’API :

- Dans le HTML des pages **Cours** et **Inscription**, avant les scripts :

  ```html
  <script>window.ATELIER_API_URL = 'https://votre-api.example.com';</script>
  ```

- Ou via une variable d’environnement au build (ex. injectée dans un template).

Sans `ATELIER_API_URL`, le site garde le comportement actuel (cours en dur, formulaire Netlify).

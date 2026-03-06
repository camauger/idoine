# Guide pas à pas : mise en place de la base de données des cours

Ce guide décrit comment mettre en place la base de données et l’API pour les cours et les inscriptions de l’Atelier St-Elme (affichage des places en temps réel, inscriptions, interface admin et export).

---

## 1. Prérequis

- **Python 3.10 ou plus** (vérifier avec `python --version` ou `python3 --version`).
- Un terminal (PowerShell, CMD, ou bash sous Linux/macOS).
- Optionnel pour la production : un compte [Render](https://render.com) ou [Railway](https://railway.app) pour héberger l’API.

---

## 2. Préparer l’environnement du backend

### 2.1 Aller dans le dossier backend

À la racine du projet (où se trouve le dossier `backend/`) :

```bash
cd backend
```

### 2.2 Créer un environnement virtuel (recommandé)

Cela évite de mélanger les paquets avec le reste du système.

**Windows (PowerShell ou CMD) :**

```bash
python -m venv venv
venv\Scripts\activate
```

**Linux / macOS :**

```bash
python3 -m venv venv
source venv/bin/activate
```

Quand le venv est activé, le préfixe `(venv)` apparaît dans le terminal.

### 2.3 Installer les dépendances

Toujours dans `backend/`, avec le venv activé :

```bash
pip install -r requirements.txt
```

Si tout se passe bien, les paquets FastAPI, SQLAlchemy, etc. sont installés.

---

## 3. Configurer les variables d’environnement (optionnel en local)

En local, les valeurs par défaut suffisent pour tester. Pour les modifier (notamment le mot de passe admin), vous pouvez :

- **Option A** : créer un fichier `.env` dans le dossier `backend/` (ne pas le committer si il contient des secrets).
- **Option B** : définir les variables dans le terminal avant de lancer l’API.

Exemple de `.env` dans `backend/` :

```env
# Mot de passe pour l’interface admin (à changer en production)
ADMIN_PASSWORD=votre_mot_de_passe_secret

# Clé pour les jetons de connexion admin (à changer en production)
SECRET_KEY=une_cle_longue_et_aleatoire

# En production ou avec Neon : URL PostgreSQL
# DATABASE_URL=postgresql://user:pass@host:5432/dbname
# Ex. Neon : copier l’URL depuis le tableau de bord (elle inclut ?sslmode=require)

# Origines autorisées pour les appels depuis le site (séparées par des virgules)
# CORS_ORIGINS=https://atelierstelme.ca,https://votre-site.netlify.app
```

Le backend charge automatiquement un fichier `.env` situé dans le dossier `backend/` au démarrage (grâce à `python-dotenv`). Si vous ne créez pas de `.env`, les valeurs par défaut sont utilisées ; vous pouvez aussi définir les variables à la main dans le terminal (voir section 5).

---

## 4. Créer la base et charger les cours (seed)

### 4.1 Créer les tables et charger les données

Depuis le dossier `backend/`, avec le venv activé :

```bash
python seed_courses.py
```

Cette commande :

1. Crée le fichier SQLite `atelier_cours.db` (et les tables `courses` et `inscriptions`) s’ils n’existent pas.
2. Remplit la table `courses` à partir de `horaire-printemps-2026.json` et des intensifs (vitrail, mosaïque de verre).

Vous devez voir un message du type : `Seed OK: 17 courses` (ou un nombre proche).

**Si vous voyez** « DB already has courses » : la base contient déjà des cours. Pour repartir de zéro, supprimez le fichier `atelier_cours.db` dans `backend/`, puis relancez `python seed_courses.py`.

### 4.2 Vérifier que la base existe

Après le seed, le fichier `backend/atelier_cours.db` doit être présent. Vous pouvez aussi vérifier en lançant l’API (étape 5) et en ouvrant http://127.0.0.1:8000/docs pour appeler `GET /api/cours`.

---

## 5. Démarrer l’API en local

Toujours dans `backend/`, venv activé :

```bash
uvicorn main:app --reload
```

- **API** : http://127.0.0.1:8000  
- **Documentation interactive** : http://127.0.0.1:8000/docs  
- **Interface admin** : http://127.0.0.1:8000/admin  

Pour vous connecter à l’admin, utilisez le mot de passe défini par `ADMIN_PASSWORD` (par défaut : `admin`).

**Sans fichier `.env`** : pour définir le mot de passe directement dans le terminal :

- **Windows (PowerShell)** :  
  `$env:ADMIN_PASSWORD="mon_mot_de_passe"; uvicorn main:app --reload`

- **Linux / macOS** :  
  `ADMIN_PASSWORD=mon_mot_de_passe uvicorn main:app --reload`

---

## 6. Tester rapidement

1. **Liste des cours** : dans le navigateur, ouvrir http://127.0.0.1:8000/api/cours  
   Vous devez voir une liste JSON de cours avec `places_restantes`.

2. **Admin** : ouvrir http://127.0.0.1:8000/admin  
   Entrer le mot de passe (par défaut `admin`). Vous devez pouvoir consulter la liste des cours et des inscriptions (vide au départ).

3. **Une inscription de test** : dans l’onglet « Inscriptions » de la doc (http://127.0.0.1:8000/docs), utiliser `POST /api/inscriptions` avec un body JSON contenant par exemple `cours: "Mosaïque de verre"`, `nom`, `courriel`, `telephone`. Puis vérifier dans l’admin que l’inscription apparaît et que vous pouvez exporter en CSV.

4. **Formulaire d’inscription du site** : avec l’API démarrée et `ATELIER_API_URL` défini (dans le `.env` à la racine du projet, lu au build), ouvrez la page **Inscription** du site (ex. http://localhost:9000/inscription/ si le site est servi par Grunt). Le sélecteur de cours est rempli depuis l’API ; à l’envoi, le formulaire envoie les données vers `POST /api/inscriptions` et les inscriptions sont enregistrées en base. Vérifiez dans l’admin (onglet Inscriptions).

---

## 7. Brancher le site statique sur l’API (optionnel)

Pour que le site Netlify affiche les places en temps réel et envoie les inscriptions vers l’API :

1. **Déployer d’abord le backend** (voir section 8) pour obtenir une URL publique (ex. `https://atelierstelme-api.onrender.com`).

2. **Indiquer cette URL au site** : définir `window.ATELIER_API_URL` avant les scripts qui appellent l’API. Par exemple dans le template de base ou sur les pages **Cours** et **Inscription** :

   ```html
   <script>window.ATELIER_API_URL = 'https://votre-api.onrender.com';</script>
   ```

   (À adapter selon votre URL réelle et votre façon d’injecter la config au build.)

3. **CORS** : sur le backend (Render/Railway), définir la variable d’environnement `CORS_ORIGINS` avec l’URL du site (ex. `https://atelierstelme.ca,https://xxx.netlify.app`).

Sans `ATELIER_API_URL`, le site continue d’afficher les cours en dur et d’utiliser le formulaire Netlify.

---

## 8. Utiliser Neon comme base PostgreSQL

[Neon](https://neon.tech) est une base PostgreSQL serverless (gratuite pour de petits projets), pratique si vous hébergez le backend sur Render, Railway ou ailleurs sans base incluse.

### 8.1 Créer une base Neon

1. Créer un compte sur [neon.tech](https://neon.tech) et vous connecter.
2. **New Project** : nommez le projet (ex. `atelierstelme`), choisissez la région la plus proche.
3. Une fois le projet créé, le tableau de bord affiche une **connection string** (ex. `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`). Copiez-la.

### 8.2 Brancher le backend

- **En local** : dans `backend/.env`, ajoutez :
  ```env
  DATABASE_URL=postgresql://...  # coller l’URL copiée depuis Neon
  ```
  Puis lancez une fois `python seed_courses.py` pour créer les tables et les données de base.

- **En production** (Render, Railway, etc.) : dans les variables d’environnement du service backend, définissez `DATABASE_URL` avec la même URL Neon. Aucune base PostgreSQL à créer sur la plateforme : tout passe par Neon.

Le backend (`database.py`) accepte déjà les URLs `postgresql://` et convertit automatiquement `postgres://` en `postgresql://` si besoin. Neon exige SSL : l’URL fournie par Neon inclut déjà `?sslmode=require`, rien à modifier.

**Résumé** : Netlify héberge le site statique ; le backend (FastAPI) tourne sur Render/Railway (ou autre) et se connecte à Neon. Vous n’installez pas de base « dans » Netlify : la base est sur Neon et utilisée par l’API.

---

## 9. Mettre en production (résumé)

1. **Créer un service backend** sur Render ou Railway (Web Service, Python).
2. **Connecter le dépôt Git** du projet et définir la racine du service sur le dossier `backend/` (ou le répertoire où se trouve `main.py`).
3. **Variables d’environnement** à définir sur la plateforme :
   - `DATABASE_URL` : URL PostgreSQL (Neon, ou base fournie par Render/Railway).
   - `ADMIN_PASSWORD` : mot de passe de l’interface admin.
   - `SECRET_KEY` : clé secrète pour les jetons JWT (générer une chaîne aléatoire).
   - `CORS_ORIGINS` : URL(s) du site (ex. `https://atelierstelme.ca`).
4. **Build / start** : en général `pip install -r requirements.txt` puis `uvicorn main:app --host 0.0.0.0 --port 8000` (adapter si la plateforme impose un autre port).
5. Une fois le déploiement actif, utiliser l’URL du service comme `ATELIER_API_URL` côté site (voir section 7).

Pour un guide détaillé par plateforme (Render, Railway), on peut l’ajouter dans ce document ou dans le README du backend.

---

## 10. En cas de problème

- **« Module not found »** : vérifier que vous êtes bien dans `backend/`, que le venv est activé et que vous avez exécuté `pip install -r requirements.txt`.
- **« DB already has courses »** : pour repartir de zéro, vider la base puis relancer le seed : dans `backend/`, exécuter `python clear_db.py` puis `python seed_courses.py`. (En SQLite uniquement, vous pouvez aussi supprimer le fichier `atelier_cours.db` puis relancer le seed.)
- **Colonne `creneau` manquante** : si la base a été créée avant l’ajout du champ créneau, exécuter une fois `python migrate_add_creneau.py` dans `backend/`.
- **Admin : « Mot de passe incorrect »** : vérifier la variable `ADMIN_PASSWORD` (ou utiliser le défaut `admin` en local).
- **Le site n’affiche pas les places** : vérifier que `window.ATELIER_API_URL` est défini et que l’URL est accessible (CORS configuré sur l’API).

---

## Récapitulatif des commandes (local)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS
pip install -r requirements.txt
python seed_courses.py
uvicorn main:app --reload
```

Puis ouvrir http://127.0.0.1:8000/admin et http://127.0.0.1:8000/docs pour vérifier que tout fonctionne.

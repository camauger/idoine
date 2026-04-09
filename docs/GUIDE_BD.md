# Guide pas à pas : mise en place de la base de données des cours

Ce guide décrit comment mettre en place la base de données et l’API pour les cours et les inscriptions de l’Atelier St-Elme (affichage des places en temps réel, inscriptions, interface admin et export).

---

## 1. Prérequis

- **Python 3.10 ou plus** (vérifier avec `python --version` ou `python3 --version`).
- Un terminal (PowerShell, CMD, ou bash sous Linux/macOS).
- Optionnel pour la production : une base [Neon](https://neon.tech) (PostgreSQL) et, pour exposer l’API, un hébergeur (Render, Railway, etc.).

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

### 4.3 Images des cours (vignettes sur la page liste `/cours/`)

La liste des cours du site est générée par le script [`src/scripts/courseList.js`](../src/scripts/courseList.js), qui consomme `GET /api/cours`. Chaque carte affiche une **image en tête**.

**Base de données**

- Colonne **`courses.image_url`** (texte, optionnelle, jusqu’à 512 caractères) : URL **publique** telle que servie par le site, en général sous **`/assets/images/...`** (les fichiers vivent dans `src/assets/images/` et sont copiés vers `dist/assets/images/` au build Grunt).
- Si la base existait **avant** l’ajout de ce champ, exécuter une fois la migration depuis `backend/` :
  ```bash
  python migrate_add_image_url.py
  ```
  À la racine du dépôt, **`just migrate`** enchaîne aussi `migrate_add_creneau.py` puis `migrate_add_image_url.py`.

**Renseigner les images via le seed (JSON)**

- Dans **`horaire-printemps-2026.json`**, chaque objet de la liste `cours` peut inclure une clé optionnelle **`image`** (chaîne), par exemple :
  ```json
  "image": "/assets/images/vitrail/vitrail-realisation-2.jpg"
  ```
- De même dans **`intensifs.json`**, pour chaque entrée de la liste `intensifs`.
- Lors d’un **`python seed_courses.py --update`**, les champs `description` / `page_dediee` / **`image`** sont synchronisés vers la base lorsqu’ils sont présents dans le JSON.

**Comportement si `image_url` est vide**

Le front applique une **image par défaut** selon la discipline (et le type « enfants » pour la céramique) : aperçus vitrail, mosaïque ou céramique déjà présents sous `assets/images/`. En dernier recours (fichier manquant ou URL incorrecte), le placeholder vectoriel **`/assets/images/course-placeholder.svg`** est utilisé.

**API FastAPI (admin)**

- Le schéma **`CourseUpdate`** accepte **`image_url`** : un `PUT /api/admin/courses/{id}` authentifié peut définir ou corriger l’URL sans repasser par le JSON de seed.

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
   Vous devez voir une liste JSON de cours avec `places_restantes` et, après migration, le champ optionnel **`image_url`** pour les vignettes de la page `/cours/`.

2. **Admin** : ouvrir http://127.0.0.1:8000/admin  
   Entrer le mot de passe (par défaut `admin`). Vous devez pouvoir consulter la liste des cours et des inscriptions (vide au départ).

3. **Une inscription de test** : dans l’onglet « Inscriptions » de la doc (http://127.0.0.1:8000/docs), utiliser `POST /api/inscriptions` avec un body JSON contenant par exemple `cours: "Mosaïque de verre"`, `nom`, `courriel`, `telephone`. Puis vérifier dans l’admin que l’inscription apparaît et que vous pouvez exporter en CSV.

4. **Formulaire d’inscription du site** : avec l’API démarrée et `ATELIER_API_URL` défini (dans le `.env` à la racine du projet, lu au build), ouvrez la page **Inscription** du site (ex. http://localhost:9000/inscription/ si le site est servi par Grunt). Le sélecteur de cours est rempli depuis l’API ; à l’envoi, le formulaire envoie les données vers `POST /api/inscriptions` et les inscriptions sont enregistrées en base. Vérifiez dans l’admin (onglet Inscriptions).

---

## 7. Brancher le site statique sur l’API (optionnel)

Pour que le site affiche les places en temps réel et envoie les inscriptions vers l’API, le front doit connaître l’**URL du backend** via `ATELIER_API_URL`.

### Où trouver la bonne adresse pour ATELIER_API_URL ?

| Contexte | Valeur à utiliser |
|----------|-------------------|
| **En local** (site sur localhost:9000, API sur votre machine) | `http://127.0.0.1:8000` ou `http://localhost:8000` — c’est l’URL où tourne `uvicorn` (section 5). À mettre dans le fichier **`.env` à la racine du projet** (pas dans `backend/`). |
| **En production** (site sur Netlify, API déployée ailleurs) | L’**URL publique de votre backend** une fois déployé. Vous la récupérez sur la plateforme qui héberge l’API : tableau de bord du service (Render, Railway, Fly.io, etc.) → onglet du déploiement → URL du type `https://votre-service.onrender.com` ou `https://xxx.railway.app`. **Sans** chemin ni barre finale (ex. `https://atelierstelme-api.onrender.com`). À définir dans **Netlify** : Site settings > Environment variables > `ATELIER_API_URL`. |

Le build du site (Python + Grunt) lit `ATELIER_API_URL` depuis le `.env` à la racine (en local) ou depuis les variables d’environnement Netlify (en prod), et l’injecte dans les pages. Aucune modification de code nécessaire.

### Étapes rapides

1. **Déployer le backend** (voir section 9) pour obtenir son URL publique en production.
2. **Définir `ATELIER_API_URL`** au bon endroit (`.env` en local, variables Netlify en prod).
3. **CORS** : sur le backend, définir `CORS_ORIGINS` avec l’URL du site (ex. `https://atelierstelme.ca,https://xxx.netlify.app`).

Sans `ATELIER_API_URL`, le site affiche les cours en dur et le formulaire d’inscription n’envoie pas vers l’API (fallback Netlify Forms si configuré).

---

## 8. Utiliser Neon comme base PostgreSQL

[Neon](https://neon.tech) est une base PostgreSQL serverless (gratuite pour de petits projets). On l’utilise ici comme base de données ; l’API (FastAPI) peut être hébergée sur n’importe quelle plateforme (Render, Railway, etc.) et se connecte à Neon via `DATABASE_URL`.

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

- **En production** (sur l’hébergeur de votre API) : dans les variables d’environnement du backend, définissez `DATABASE_URL` avec l’URL Neon. La base reste sur Neon ; l’API s’y connecte à distance.

Le backend (`database.py`) accepte déjà les URLs `postgresql://` et convertit automatiquement `postgres://` en `postgresql://` si besoin. Neon exige SSL : l’URL fournie par Neon inclut déjà `?sslmode=require`, rien à modifier.

**Intégration Netlify + Neon** : si vous connectez Neon à votre site Netlify, Netlify injecte automatiquement `NETLIFY_DATABASE_URL` (pooled) et `NETLIFY_DATABASE_URL_UNPOOLED`. Le backend utilise ces variables en priorité lorsqu’elles sont présentes (par ex. si l’API tourne dans un contexte Netlify). En local, continuez d’utiliser `DATABASE_URL` dans `backend/.env`.

**Résumé** : Netlify héberge le site statique ; la base de données est sur **Neon** ; le backend (FastAPI) tourne sur l’hébergeur de votre choix et se connecte à Neon. La base n’est pas hébergée sur Netlify.

### Courriel de confirmation (inscriptions sur Netlify)

Lorsque le site est déployé sur **Netlify** et que les inscriptions passent par le formulaire Netlify (function `submission-created`) ou par **`POST /api/inscriptions`** sur la même origine (`netlify/functions/api.mjs`), un **courriel transactionnel** est envoyé au participant après enregistrement réussi en base, via l’API [Resend](https://resend.com).

Variables d’environnement à définir dans **Netlify** (Site settings > Environment variables) :

- `RESEND_API_KEY` — clé API Resend  
- `CONFIRMATION_EMAIL_FROM` — expéditeur vérifié chez Resend (ex. `Ateliers St-Elme <inscription@atelierstelme.ca>`)

Si ces variables sont absentes, l’inscription fonctionne toujours mais **aucun courriel de confirmation** n’est envoyé. En cas de doublon détecté (même personne et même cours dans les 15 dernières minutes), aucun second courriel n’est envoyé.

---

## 9. Mettre en production (résumé)

1. **Base de données** : utiliser **Neon** (section 8). Récupérer l’URL de connexion et la garder pour l’étape 3.
2. **Héberger l’API** : créer un service backend (Web Service Python) sur la plateforme de votre choix (Render, Railway, Fly.io, etc.), en pointant vers le dossier `backend/` ou le répertoire de `main.py`.
3. **Variables d’environnement** du backend (sur la plateforme d’hébergement de l’API) :
   - `DATABASE_URL` : **URL Neon** (PostgreSQL) copiée depuis le tableau de bord Neon.
   - `ADMIN_PASSWORD` : mot de passe de l’interface admin.
   - `SECRET_KEY` : clé secrète pour les jetons JWT (chaîne aléatoire).
   - `CORS_ORIGINS` : URL(s) du site (ex. `https://atelierstelme.ca,https://xxx.netlify.app`).
4. **Build / start** : en général `pip install -r requirements.txt` puis `uvicorn main:app --host 0.0.0.0 --port 8000` (adapter si la plateforme impose un autre port).
5. Une fois l’API en ligne, définir son URL comme `ATELIER_API_URL` côté site (Netlify ou `.env` à la racine), voir section 7.

---

## 10. En cas de problème

- **« Module not found »** : vérifier que vous êtes bien dans `backend/`, que le venv est activé et que vous avez exécuté `pip install -r requirements.txt`.
- **« DB already has courses »** : pour repartir de zéro, vider la base puis relancer le seed : dans `backend/`, exécuter `python clear_db.py` puis `python seed_courses.py`. (En SQLite uniquement, vous pouvez aussi supprimer le fichier `atelier_cours.db` puis relancer le seed.)
- **Colonne `creneau` manquante** : si la base a été créée avant l’ajout du champ créneau, exécuter une fois `python migrate_add_creneau.py` dans `backend/`.
- **Colonne `image_url` manquante** (vignettes `/cours/`) : exécuter une fois `python migrate_add_image_url.py` dans `backend/`, ou `just migrate` pour appliquer les migrations cours prévues (voir section 4.3).
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

# Justfile - Atelier St-Elme
# https://github.com/casey/just

# Variables
python := "python"
npm := "npm"

# Recette par défaut : afficher l'aide
default:
    @just --list

# ============================================================================
# DÉVELOPPEMENT
# ============================================================================

# Lancer le serveur de développement complet (Netlify Dev, CLI versionnée via npx, cwd = racine du repo)
dev:
    node scripts/run-netlify-dev-from-root.js

# Si `just dev` échoue sur Deno / Edge Functions : nettoyer le cache du CLI puis relancer `just dev`
dev-fix-netlify-deno:
    npm run reset-netlify-deno

# Lancer uniquement le serveur Python (sans fonctions Netlify)
dev-py:
    {{python}} scripts/dev_server.py

# Surveiller les changements SCSS uniquement
watch:
    npx grunt watchOnly

# Lancer Grunt en mode développement
grunt-dev:
    npx grunt dev

# ============================================================================
# BUILD
# ============================================================================

# Compiler le site complet (HTML + CSS + assets)
build:
    npx grunt build

# Compiler uniquement les styles SCSS
build-css:
    npx grunt sass:prod && npx grunt postcss:prod && npx grunt cssmin:prod

# Compiler uniquement le HTML (Python)
build-html:
    {{python}} scripts/core/build.py --build

# Nettoyer le dossier dist
clean:
    npx grunt clean:all

# ============================================================================
# BASE DE DONNÉES
# ============================================================================

# Peupler la base de données avec les cours
seed:
    cd backend && {{python}} seed_courses.py

# Mettre à jour les cours existants
seed-update:
    cd backend && {{python}} seed_courses.py --update

# Vider la base de données
clear-db:
    cd backend && {{python}} clear_db.py

# Lancer les migrations (schéma cours)
migrate:
    cd backend && {{python}} migrate_add_creneau.py && {{python}} migrate_add_image_url.py

# ============================================================================
# IMAGES
# ============================================================================

# Optimiser toutes les images
optimize-images:
    node scripts/optimize-images.js

# ============================================================================
# DÉPLOIEMENT
# ============================================================================

# Déployer sur Netlify (preview)
deploy-preview:
    netlify deploy

# Déployer sur Netlify (production)
deploy:
    netlify deploy --prod

# ============================================================================
# TESTS & QUALITÉ
# ============================================================================

# Lancer les tests Python
test:
    pytest tests/ -v

# Lancer les tests avec couverture
test-cov:
    pytest tests/ --cov=scripts --cov-report=html

# Audit des dépendances npm
audit:
    {{npm}} audit --audit-level=moderate || true

# Corriger les vulnérabilités npm
audit-fix:
    {{npm}} audit fix || true

# ============================================================================
# UTILITAIRES
# ============================================================================

# Installer les dépendances
install:
    {{npm}} install
    pip install -r requirements.txt

# Mettre à jour les dépendances npm
update:
    {{npm}} update

# Afficher la version du projet
version:
    @cat package.json | grep '"version"' | head -1

# Convertir un CSV en Excel
csv-to-excel file:
    {{python}} -c "import pandas as pd; df = pd.read_csv('{{file}}', encoding='utf-8'); df.to_excel('{{file}}'.replace('.csv', '.xlsx'), index=False, engine='openpyxl'); print('Fichier créé:', '{{file}}'.replace('.csv', '.xlsx'))"

# Ouvrir le site local dans le navigateur
open:
    open http://localhost:8888 || xdg-open http://localhost:8888 || start http://localhost:8888

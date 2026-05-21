# Justfile - Ludomancien
# Usage: just <commande>
# Documentation: https://just.systems/

# Use PowerShell on Windows so recipes don't depend on Git Bash being in PATH.
set windows-shell := ["powershell.exe", "-NoProfile", "-NoLogo", "-Command"]

# Variables
python := "python"
venv := "venv"

# =============================================================================
# Commandes par défaut
# =============================================================================

# Afficher l'aide
default:
    @just --list

# =============================================================================
# Installation
# =============================================================================

# Installation complète (Python + Node). Idempotent — n'écrase pas un
# venv sain. Si le venv est cassé (ex: changement de version de Python),
# lance `just reset-venv` d'abord.
install:
    if (-not (Test-Path {{venv}})) { {{python}} -m venv {{venv}} }
    {{venv}}/Scripts/pip install -r requirements.txt
    npm install
    @Write-Host "OK Installation terminee"

# Recréer le venv from scratch (utile après upgrade de Python)
reset-venv:
    if (Test-Path {{venv}}) { Remove-Item -Recurse -Force {{venv}} }
    {{python}} -m venv {{venv}}
    {{venv}}/Scripts/pip install -r requirements.txt
    @Write-Host "OK Venv recree"

# Installer uniquement les dépendances Python
install-py:
    {{venv}}/Scripts/pip install -r requirements.txt

# Installer uniquement les dépendances Node
install-node:
    npm install

# =============================================================================
# Développement
# =============================================================================

# Lancer le serveur de développement
dev:
    {{python}} scripts/dev_server.py

# Watch les fichiers SCSS
watch:
    npx grunt watch

# Build de développement
build-dev:
    {{python}} scripts/build.py --dev

# =============================================================================
# Production
# =============================================================================

# Build de production complet
build:
    npx grunt build
    {{python}} scripts/build.py

# Prévisualiser le build de production
preview:
    {{python}} -m http.server 8000 --directory dist

# =============================================================================
# Contenu
# =============================================================================

# Créer un nouvel article
new-post slug:
    @Set-Content -Path "src/locales/fr/posts/{{slug}}.md" -Encoding utf8 -Value "---`nname: Titre de l'article`ndescription: Description`nslug: {{slug}}`ndate: $(Get-Date -Format yyyy-MM-dd)`ntags: [`"jeux de rôle`"]`nbanner: /images/default.jpg`nthumbnail: /images/thumbnails/default.jpg`n---`n`nContenu de l'article..."; Write-Host "✓ Article créé: src/locales/fr/posts/{{slug}}.md"

# Lister tous les articles
list-posts:
    @Write-Host "$((Get-ChildItem src/locales/fr/posts/*.md | Measure-Object).Count) articles dans src/locales/fr/posts/"

# =============================================================================
# Utilitaires
# =============================================================================

# Nettoyer les fichiers générés
clean:
    if (Test-Path dist) { Remove-Item -Recurse -Force dist }
    if (Test-Path node_modules/.cache) { Remove-Item -Recurse -Force node_modules/.cache }
    @Write-Host "✓ Nettoyé"

# Vérifier les liens (nécessite un outil externe)
check-links:
    @echo "Vérification des liens dans dist/..."
    @echo "(Installer linkchecker pour cette fonctionnalité)"

# Optimiser les images (nécessite imagemin)
optimize-images:
    @echo "Optimisation des images..."
    @echo "(Configurer imagemin dans Gruntfile.js)"

# =============================================================================
# Déploiement
# =============================================================================

# Déployer manuellement sur Netlify (nécessite netlify-cli)
deploy:
    npx netlify deploy --prod --dir=dist

# Prévisualiser le déploiement
deploy-preview:
    npx netlify deploy --dir=dist

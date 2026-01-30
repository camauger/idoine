#!/usr/bin/env bash
# ============================================================
# IDOINE - Script d'initialisation
# ============================================================
# Ce script prépare votre environnement de développement
# et configure votre nouveau site basé sur le thème Idoine.
#
# Usage:
#   ./init.sh --minimal    # Contenu minimal pour partir de zéro
#   ./init.sh --demo       # Garde le contenu exemple
#   ./init.sh --help       # Affiche l'aide
# ============================================================

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

# Afficher l'aide
show_help() {
    echo ""
    echo "IDOINE - Script d'initialisation"
    echo ""
    echo "Usage: ./init.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --minimal    Installe avec un contenu minimal (recommandé pour un nouveau site)"
    echo "  --demo       Garde le contenu de démonstration existant"
    echo "  --help       Affiche cette aide"
    echo ""
    echo "Exemples:"
    echo "  ./init.sh --minimal    # Pour créer votre propre site"
    echo "  ./init.sh --demo       # Pour explorer le thème avec du contenu exemple"
    echo ""
}

# Vérifier les prérequis
check_prerequisites() {
    print_header "Vérification des prérequis"

    local has_error=0

    # Vérifier Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            print_success "Node.js $(node -v) détecté"
        else
            print_error "Node.js 18+ requis (version actuelle: $(node -v))"
            has_error=1
        fi
    else
        print_error "Node.js n'est pas installé"
        has_error=1
    fi

    # Vérifier npm
    if command -v npm >/dev/null 2>&1; then
        print_success "npm $(npm -v) détecté"
    else
        print_error "npm n'est pas installé"
        has_error=1
    fi

    # Vérifier Python
    if command -v python >/dev/null 2>&1; then
        PYTHON_VERSION=$(python --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)
        if [ "$PYTHON_MAJOR" -ge 3 ] && [ "$PYTHON_MINOR" -ge 9 ]; then
            print_success "Python $(python --version 2>&1 | cut -d' ' -f2) détecté"
        else
            print_error "Python 3.9+ requis (version actuelle: $PYTHON_VERSION)"
            has_error=1
        fi
    else
        print_error "Python n'est pas installé"
        has_error=1
    fi

    if [ $has_error -eq 1 ]; then
        echo ""
        print_error "Veuillez installer les dépendances manquantes avant de continuer."
        exit 1
    fi
}

# Installer les dépendances Node.js
install_node_deps() {
    print_header "Installation des dépendances Node.js"

    # Installer grunt-cli globalement si nécessaire
    if ! command -v grunt >/dev/null 2>&1; then
        print_info "Installation de grunt-cli..."
        npm install -g grunt-cli
    else
        print_success "grunt-cli déjà installé"
    fi

    # Installer les dépendances du projet
    print_info "Installation des packages npm..."
    npm install
    print_success "Dépendances Node.js installées"
}

# Créer et configurer l'environnement Python
setup_python_env() {
    print_header "Configuration de l'environnement Python"

    # Créer l'environnement virtuel si nécessaire
    if [ ! -d "venv" ]; then
        print_info "Création de l'environnement virtuel..."
        python -m venv venv
        print_success "Environnement virtuel créé"
    else
        print_success "Environnement virtuel existant"
    fi

    # Activer l'environnement virtuel
    if [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
    elif [ -f "venv/Scripts/activate" ]; then
        . venv/Scripts/activate
    fi

    # Installer les dépendances Python
    print_info "Installation des packages Python..."
    pip install -r requirements.txt --quiet
    print_success "Dépendances Python installées"
}

# Configurer le contenu minimal
setup_minimal_content() {
    print_header "Configuration du contenu minimal"

    # Vérifier si le dossier starters existe
    if [ ! -d "starters/minimal" ]; then
        print_error "Le dossier starters/minimal n'existe pas"
        exit 1
    fi

    # Sauvegarder la configuration actuelle si elle a été modifiée
    if [ -f "src/config/site_config.yaml" ]; then
        print_info "Sauvegarde de la configuration actuelle..."
        cp src/config/site_config.yaml src/config/site_config.yaml.backup
    fi

    # Supprimer le contenu exemple
    print_info "Suppression du contenu exemple..."
    rm -rf src/locales/*

    # Copier le contenu minimal
    print_info "Installation du contenu minimal..."
    cp -r starters/minimal/locales/* src/locales/

    # Copier le template de configuration
    if [ -f "starters/config/site_config.template.yaml" ]; then
        cp starters/config/site_config.template.yaml src/config/site_config.yaml
    fi

    print_success "Contenu minimal installé"
}

# Configurer le site
configure_site() {
    print_header "Configuration du site"

    echo ""
    echo "Entrez les informations de votre site (appuyez sur Entrée pour garder la valeur par défaut)"
    echo ""

    # Demander le nom du site
    read -p "Nom du site [Mon Site]: " SITE_TITLE
    SITE_TITLE=${SITE_TITLE:-"Mon Site"}

    # Demander le tagline
    read -p "Tagline [Mon site personnel]: " SITE_TAGLINE
    SITE_TAGLINE=${SITE_TAGLINE:-"Mon site personnel"}

    # Demander l'auteur
    read -p "Auteur [Auteur]: " SITE_AUTHOR
    SITE_AUTHOR=${SITE_AUTHOR:-"Auteur"}

    # Demander l'URL de base
    read -p "URL de production [https://example.com]: " SITE_URL
    SITE_URL=${SITE_URL:-"https://example.com"}

    # Mettre à jour le fichier de configuration
    print_info "Mise à jour de la configuration..."

    # Échapper les caractères spéciaux pour YAML (doubles guillemets)
    # Remplacer les guillemets doubles par des guillemets échappés
    SITE_TITLE=$(echo "$SITE_TITLE" | sed 's/"/\\"/g')
    SITE_TAGLINE=$(echo "$SITE_TAGLINE" | sed 's/"/\\"/g')
    SITE_AUTHOR=$(echo "$SITE_AUTHOR" | sed 's/"/\\"/g')

    # Utiliser sed pour remplacer les valeurs (compatible macOS et Linux)
    # Utiliser des guillemets doubles pour supporter les apostrophes
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|^title:.*|title: \"$SITE_TITLE\"|" src/config/site_config.yaml
        sed -i '' "s|^tagline:.*|tagline: \"$SITE_TAGLINE\"|" src/config/site_config.yaml
        sed -i '' "s|^author:.*|author: \"$SITE_AUTHOR\"|" src/config/site_config.yaml
        sed -i '' "s|^base_url:.*|base_url: \"$SITE_URL\"|" src/config/site_config.yaml
    else
        # Linux/Windows Git Bash
        sed -i "s|^title:.*|title: \"$SITE_TITLE\"|" src/config/site_config.yaml
        sed -i "s|^tagline:.*|tagline: \"$SITE_TAGLINE\"|" src/config/site_config.yaml
        sed -i "s|^author:.*|author: \"$SITE_AUTHOR\"|" src/config/site_config.yaml
        sed -i "s|^base_url:.*|base_url: \"$SITE_URL\"|" src/config/site_config.yaml
    fi

    print_success "Configuration mise à jour"
}

# Créer le fichier .env
create_env_file() {
    if [ ! -f ".env" ]; then
        print_info "Création du fichier .env..."
        cp env.example .env
        print_success "Fichier .env créé"
    else
        print_success "Fichier .env existant"
    fi
}

# Tester le build
test_build() {
    print_header "Test du build"

    print_info "Génération du site..."

    # Activer l'environnement virtuel si nécessaire
    if [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
    elif [ -f "venv/Scripts/activate" ]; then
        . venv/Scripts/activate
    fi

    # Exécuter le build
    if npm run build; then
        print_success "Build réussi!"
    else
        print_warning "Le build a échoué. Vérifiez les erreurs ci-dessus."
        return 1
    fi
}

# Afficher les instructions finales
show_final_instructions() {
    print_header "Installation terminée!"

    echo "Votre site Idoine est prêt. Voici les prochaines étapes:"
    echo ""
    echo -e "${GREEN}1.${NC} Lancez le serveur de développement:"
    echo "   npm run dev"
    echo ""
    echo -e "${GREEN}2.${NC} Ouvrez votre navigateur à:"
    echo "   http://localhost:9000"
    echo ""
    echo -e "${GREEN}3.${NC} Modifiez le contenu dans:"
    echo "   src/locales/fr/pages/    (pages)"
    echo "   src/locales/fr/posts/    (articles de blog)"
    echo ""
    echo -e "${GREEN}4.${NC} Personnalisez le thème dans:"
    echo "   src/styles/base/_variables.scss"
    echo ""
    echo "Pour plus d'informations, consultez:"
    echo "   - README.md"
    echo "   - docs/GETTING_STARTED.md"
    echo "   - docs/THEMING.md"
    echo ""
}

# ============================================================
# SCRIPT PRINCIPAL
# ============================================================

# Vérifier les arguments
MODE=""
for arg in "$@"; do
    case $arg in
        --minimal)
            MODE="minimal"
            shift
            ;;
        --demo)
            MODE="demo"
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Option inconnue: $arg"
            show_help
            exit 1
            ;;
    esac
done

# Si aucun mode n'est spécifié, demander à l'utilisateur
if [ -z "$MODE" ]; then
    echo ""
    echo "Bienvenue dans le script d'initialisation d'Idoine!"
    echo ""
    echo "Choisissez un mode d'installation:"
    echo "  1) Minimal - Contenu vide pour créer votre propre site"
    echo "  2) Demo    - Garde le contenu exemple pour explorer"
    echo ""
    read -p "Votre choix [1/2]: " choice
    case $choice in
        1|minimal)
            MODE="minimal"
            ;;
        2|demo)
            MODE="demo"
            ;;
        *)
            print_error "Choix invalide. Utilisez 1 ou 2."
            exit 1
            ;;
    esac
fi

print_header "IDOINE - Initialisation (mode: $MODE)"

# Exécuter les étapes d'installation
check_prerequisites
install_node_deps
setup_python_env
create_env_file

# Configurer selon le mode
if [ "$MODE" = "minimal" ]; then
    setup_minimal_content
    configure_site
fi

# Tester le build
test_build

# Afficher les instructions finales
show_final_instructions

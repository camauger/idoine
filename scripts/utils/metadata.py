import logging

import yaml


def extract_metadata(content: str) -> dict:
    """Extrait les métadonnées d'un contenu Markdown via le parseur centralisé."""
    try:
        from utils.frontmatter_parser import parse_frontmatter

        metadata, _ = parse_frontmatter(content)
        return metadata
    except yaml.YAMLError as e:
        logging.error(f"Erreur YAML lors de l'extraction des métadonnées: {e}")
    except Exception as e:
        logging.error(f"Erreur générale lors de l'extraction des métadonnées: {e}")
    return {}

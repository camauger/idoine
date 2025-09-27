import logging
from typing import Any, Dict, cast

import yaml

from .errors import MetadataParsingError
from .metadata_schema import ContentMetadata


def extract_metadata(content: str) -> dict:
    """Extrait les métadonnées d'un contenu Markdown via le parseur centralisé."""
    try:
        from utils.frontmatter_parser import parse_frontmatter

        metadata, _ = parse_frontmatter(content)
        # Ensure plain dict with str keys for model init
        metadata_dict: Dict[str, Any] = dict(metadata)
        validated = ContentMetadata(**metadata_dict)  # type: ignore[arg-type]
        return validated.dict()
    except yaml.YAMLError as e:
        logging.error(f"Erreur YAML lors de l'extraction des métadonnées: {e}")
        raise MetadataParsingError(str(e))
    except Exception as e:
        logging.error(f"Erreur générale lors de l'extraction des métadonnées: {e}")
        raise MetadataParsingError(str(e))

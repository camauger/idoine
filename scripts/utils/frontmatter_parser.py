import logging

import frontmatter

from .errors import FrontmatterParsingError


def _ensure_list(value):
    """
    Normalize scalar or list-like metadata fields to a list of strings.
    """
    if value is None:
        return []
    if isinstance(value, (list, tuple)):
        return [str(v).strip() for v in value if str(v).strip()]
    # Handle comma-separated strings
    text = str(value).strip()
    if not text:
        return []
    return [v.strip() for v in text.strip("[]").split(",") if v.strip()]


def parse_frontmatter(content: str):
    """
    Analyse le front matter d'un fichier Markdown avec python-frontmatter.
    Renvoie un tuple (metadata: dict, markdown_content: str).
    Assure la normalisation de certaines clés en listes.
    """
    try:
        parsed = frontmatter.loads(content)
        metadata = dict(parsed.metadata or {})
        # Normalize common list fields
        for key in ["categories", "meta_keywords", "tags"]:
            metadata[key] = _ensure_list(metadata.get(key))
        return metadata, parsed.content
    except Exception as e:
        logging.error(f"Erreur lors du parsing du front matter: {e}")
        raise FrontmatterParsingError(str(e))

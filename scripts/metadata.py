from frontmatter_parser import parse_frontmatter


def extract_metadata(content: str) -> dict:
    """Extrait les métadonnées d'un contenu Markdown en utilisant le front matter YAML."""
    metadata, _ = parse_frontmatter(content)
    metadata.setdefault('categories', [])
    metadata.setdefault('meta_keywords', [])
    return metadata

class BuildError(Exception):
    """Erreur générique pour le processus de build du site."""


class FrontmatterParsingError(BuildError):
    """Erreur lors de l'analyse du front matter Markdown."""


class MetadataParsingError(BuildError):
    """Erreur lors de l'extraction/validation des métadonnées."""

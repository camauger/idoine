"""
Pydantic schema for site configuration validation.

Validates site_config.yaml to ensure all required fields
are present and have correct types.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class SiteConfig(BaseModel):
    """Schema for site_config.yaml validation."""

    # Required fields
    title: str = Field(..., description="Site title")

    # Optional fields with defaults
    description: str = Field(default="", description="Site description")
    author: str = Field(default="", description="Site author")
    keywords: str = Field(default="", description="Site keywords for SEO")

    # Language settings
    languages: List[str] = Field(
        default_factory=lambda: ["fr"],
        description="Supported languages",
    )
    default_lang: str = Field(default="fr", description="Default language")

    # URL settings
    blog_url: str = Field(default="/blog/", description="Blog base URL")
    glossary_url: str = Field(default="/glossaire/", description="Glossary base URL")
    gallery_url: str = Field(default="/gallery/", description="Gallery base URL")

    # Pagination
    posts_per_page: int = Field(default=5, ge=1, description="Posts per page")
    terms_per_page: int = Field(default=10, ge=1, description="Glossary terms per page")

    # Templates
    post_template: str = Field(default="posts/post.html")
    blog_template: str = Field(default="pages/blog.html")
    home_template: str = Field(default="pages/home.html")
    glossary_template: str = Field(default="pages/glossary.html")
    term_template: str = Field(default="pages/glossary-term.html")
    category_template: str = Field(default="pages/category.html")
    keyword_template: str = Field(default="pages/keyword.html")
    gallery_template: str = Field(default="pages/gallery.html")

    # Feature flags
    unilingual: Optional[bool] = Field(
        default=None,
        description="Override multilingual detection",
    )

    # Allow extra fields
    model_config = {"extra": "allow"}

    @field_validator("languages", mode="before")
    @classmethod
    def ensure_languages_list(cls, v: Any) -> List[str]:
        """Ensure languages is a list."""
        if v is None:
            return ["fr"]
        if isinstance(v, str):
            return [v]
        return list(v)

    @field_validator("blog_url", "glossary_url", "gallery_url", mode="after")
    @classmethod
    def ensure_url_format(cls, v: str) -> str:
        """Ensure URLs have proper format."""
        v = v.strip()
        if not v.startswith("/"):
            v = "/" + v
        if not v.endswith("/"):
            v = v + "/"
        return v

    @property
    def is_multilingual(self) -> bool:
        """Check if site has multiple languages."""
        if self.unilingual is not None:
            return not self.unilingual
        return len(self.languages) > 1


class TranslationsConfig(BaseModel):
    """Schema for a single language's translations."""

    site_name: str = Field(default="")
    blog_title: str = Field(default="Blog")
    home_title: str = Field(default="")
    glossary_title: str = Field(default="Glossaire")
    read_more: str = Field(default="Read more")
    previous: str = Field(default="Previous")
    next: str = Field(default="Next")
    page: str = Field(default="Page")
    of: str = Field(default="of")
    categories: str = Field(default="Categories")
    tags: str = Field(default="Tags")
    keywords: str = Field(default="Keywords")
    search: str = Field(default="Search")

    # Allow extra fields for flexibility
    model_config = {"extra": "allow"}


def validate_site_config(config: Dict[str, Any]) -> SiteConfig:
    """
    Validate site configuration dictionary.

    Args:
        config: Raw configuration dictionary.

    Returns:
        Validated SiteConfig instance.

    Raises:
        ValidationError: If configuration is invalid.
    """
    return SiteConfig.model_validate(config)


def validate_translations(
    translations: Dict[str, Dict[str, Any]]
) -> Dict[str, TranslationsConfig]:
    """
    Validate translations dictionary.

    Args:
        translations: Raw translations dictionary keyed by language.

    Returns:
        Dictionary of validated TranslationsConfig instances.

    Raises:
        ValidationError: If translations are invalid.
    """
    return {
        lang: TranslationsConfig.model_validate(trans)
        for lang, trans in translations.items()
    }


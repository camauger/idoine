from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class ContentMetadata(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    author: Optional[str] = None
    slug: Optional[str] = None
    translation_id: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
    meta_keywords: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    thumbnail: Optional[str] = None
    template: Optional[str] = None

    @validator("date")
    def validate_date_format(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v:
            return v
        # expect YYYY-MM-DD
        try:
            parts = [int(p) for p in v.split("-")]
            assert len(parts) == 3
            date(parts[0], parts[1], parts[2])
        except Exception:
            raise ValueError("date must be in YYYY-MM-DD format")
        return v

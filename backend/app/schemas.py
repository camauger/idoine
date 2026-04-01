"""Pydantic schemas for API."""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class CourseBase(BaseModel):
    nom: str
    slug: str
    discipline: str
    type_cours: str
    jour: Optional[str] = None
    creneau: Optional[str] = None
    heure: Optional[str] = None
    duree_semaines: Optional[int] = None
    date_debut: Optional[str] = None
    places_max: int = 0
    prix: Optional[str] = None
    prof: Optional[str] = None
    salle: Optional[str] = None
    description: Optional[str] = None
    actif: bool = True
    badge_new: bool = False
    page_dediee: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    nom: Optional[str] = None
    slug: Optional[str] = None
    discipline: Optional[str] = None
    type_cours: Optional[str] = None
    jour: Optional[str] = None
    creneau: Optional[str] = None
    heure: Optional[str] = None
    duree_semaines: Optional[int] = None
    date_debut: Optional[str] = None
    places_max: Optional[int] = None
    prix: Optional[str] = None
    prof: Optional[str] = None
    salle: Optional[str] = None
    description: Optional[str] = None
    actif: Optional[bool] = None
    badge_new: Optional[bool] = None
    page_dediee: Optional[str] = None


class CourseResponse(CourseBase):
    id: int
    places_restantes: int = 0

    class Config:
        from_attributes = True


class InscriptionCreate(BaseModel):
    course_id: Optional[int] = None
    cours: Optional[str] = None  # nom du cours si course_id non fourni (mapping côté API)
    nom: str
    courriel: str
    telephone: str
    enfant: Optional[str] = None
    jour_prefere: Optional[str] = None
    horaire_prefere: Optional[str] = None
    message: Optional[str] = None
    newsletter: bool = False


class InscriptionResponse(BaseModel):
    id: int
    course_id: int
    nom: str
    courriel: str
    telephone: str
    enfant: Optional[str] = None
    jour_prefere: Optional[str] = None
    horaire_prefere: Optional[str] = None
    message: Optional[str] = None
    newsletter: bool
    est_membre: bool = False
    created_at: datetime
    course_nom: Optional[str] = None
    # date_debut du cours (session), ex. « 11 avril » — renseigné côté admin
    course_date: Optional[str] = None

    class Config:
        from_attributes = True

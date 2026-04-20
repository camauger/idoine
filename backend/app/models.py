"""SQLAlchemy models for courses and inscriptions."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(255), nullable=False, index=True)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    discipline = Column(String(50), nullable=False)  # ceramique | vitrail | mosaique
    type_cours = Column(String(50), nullable=False)   # regulier | intensif | enfants
    jour = Column(String(50), nullable=True)
    creneau = Column(String(50), nullable=True)      # matin | après-midi | soir (from JSON)
    heure = Column(String(100), nullable=True)
    duree_semaines = Column(Integer, nullable=True)
    date_debut = Column(String(100), nullable=True)
    places_max = Column(Integer, nullable=False, default=0)
    prix = Column(String(100), nullable=True)
    prof = Column(String(100), nullable=True)
    salle = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    actif = Column(Boolean, default=True, nullable=False)
    badge_new = Column(Boolean, default=False, nullable=False)
    page_dediee = Column(String(255), nullable=True)  # slug of dedicated page if any
    image_url = Column(String(512), nullable=True)  # ex. /assets/images/... ; sinon placeholder par discipline côté front
    # Plusieurs lignes partagent le même groupe (même cours, créneaux différents) ; NULL = cours seul.
    groupe_slug = Column(String(255), nullable=True, index=True)

    inscriptions = relationship("Inscription", back_populates="course", cascade="all, delete-orphan")


class Inscription(Base):
    __tablename__ = "inscriptions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    nom = Column(String(255), nullable=False)
    courriel = Column(String(255), nullable=False)
    telephone = Column(String(50), nullable=False)
    enfant = Column(String(255), nullable=True)
    jour_prefere = Column(String(50), nullable=True)
    horaire_prefere = Column(String(100), nullable=True)  # comma-separated or JSON
    message = Column(Text, nullable=True)
    newsletter = Column(Boolean, default=False, nullable=False)
    est_membre = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    course = relationship("Course", back_populates="inscriptions")

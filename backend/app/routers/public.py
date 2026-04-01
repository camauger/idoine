"""Public API: courses list and inscription submission."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from app.models import Course, Inscription
from app.schemas import CourseResponse, InscriptionCreate, InscriptionResponse

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/cours", response_model=list[CourseResponse])
def list_cours(actif_only: bool = True, db: Session = Depends(get_db)):
    """List all courses with places_restantes (inscrits count)."""
    q = db.query(Course)
    if actif_only:
        q = q.filter(Course.actif == True)
    courses = q.order_by(Course.discipline, Course.type_cours, Course.jour).all()
    result = []
    fields = [f for f in CourseResponse.model_fields if f != "places_restantes"]
    for c in courses:
        count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == c.id).scalar() or 0
        restantes = max(0, c.places_max - count)
        result.append(CourseResponse(
            **{k: getattr(c, k) for k in fields},
            places_restantes=restantes
        ))
    return result


@router.get("/cours/{slug_or_id}", response_model=CourseResponse)
def get_cours(slug_or_id: str, db: Session = Depends(get_db)):
    """Get one course by slug or id with places_restantes."""
    if slug_or_id.isdigit():
        course = db.query(Course).filter(Course.id == int(slug_or_id)).first()
    else:
        course = db.query(Course).filter(Course.slug == slug_or_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == course.id).scalar() or 0
    restantes = max(0, course.places_max - count)
    fields = [f for f in CourseResponse.model_fields if f != "places_restantes"]
    return CourseResponse(
        **{k: getattr(course, k) for k in fields},
        places_restantes=restantes
    )


@router.post("/inscriptions", response_model=InscriptionResponse)
def create_inscription(data: InscriptionCreate, db: Session = Depends(get_db)):
    """Register for a course. Use course_id or cours (course name) to link."""
    course = None
    if data.course_id:
        course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course and data.cours:
        course = db.query(Course).filter(Course.nom == data.cours).first()
    if not course:
        raise HTTPException(status_code=400, detail="Cours non trouvé (course_id ou cours invalide)")
    count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == course.id).scalar() or 0
    if count >= course.places_max:
        raise HTTPException(status_code=400, detail="Ce cours est complet.")
    since = datetime.utcnow() - timedelta(minutes=15)
    nom_n = data.nom.strip().lower()
    email_n = data.courriel.strip().lower()
    enfant_n = (data.enfant or "").strip()
    recent = (
        db.query(Inscription)
        .filter(Inscription.course_id == course.id, Inscription.created_at >= since)
        .all()
    )
    for row in recent:
        if (
            (row.nom or "").strip().lower() == nom_n
            and (row.courriel or "").strip().lower() == email_n
            and (row.enfant or "").strip() == enfant_n
        ):
            return InscriptionResponse(
                **{k: getattr(row, k) for k in InscriptionResponse.model_fields if k != "course_nom"},
                course_nom=course.nom,
            )
    ins = Inscription(
        course_id=course.id,
        nom=data.nom,
        courriel=data.courriel,
        telephone=data.telephone,
        enfant=data.enfant,
        jour_prefere=data.jour_prefere,
        horaire_prefere=data.horaire_prefere,
        message=data.message,
        newsletter=data.newsletter,
    )
    db.add(ins)
    db.commit()
    db.refresh(ins)
    return InscriptionResponse(
        **{k: getattr(ins, k) for k in InscriptionResponse.model_fields if k != "course_nom"},
        course_nom=course.nom
    )

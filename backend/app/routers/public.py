"""Public API: courses list and inscription submission."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from app.models import Course, Inscription
from app.schemas import CourseResponse, InscriptionCreate, InscriptionResponse

router = APIRouter(prefix="/api", tags=["public"])


def _participant_lines(data: InscriptionCreate) -> list[tuple[str, str | None]]:
    if data.participants:
        return [
            (p.nom.strip(), (p.enfant or "").strip() or None)
            for p in data.participants
            if p.nom and p.nom.strip()
        ]
    return [
        (
            (data.nom or "").strip(),
            (data.enfant or "").strip() or None,
        )
    ]


@router.get("/cours", response_model=list[CourseResponse])
def list_cours(response: Response, actif_only: bool = True, db: Session = Depends(get_db)):
    """List all courses with places_restantes (inscrits count)."""
    response.headers["Cache-Control"] = "private, no-store, no-cache, must-revalidate"
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
def get_cours(response: Response, slug_or_id: str, db: Session = Depends(get_db)):
    """Get one course by slug or id with places_restantes."""
    response.headers["Cache-Control"] = "private, no-store, no-cache, must-revalidate"
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

    lines = _participant_lines(data)
    if not lines:
        raise HTTPException(status_code=400, detail="Au moins une personne avec un nom est requis")

    count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == course.id).scalar() or 0
    if count + len(lines) > course.places_max:
        raise HTTPException(
            status_code=400,
            detail="Ce cours est complet ou il ne reste pas assez de places pour ce nombre de personnes.",
        )

    since = datetime.utcnow() - timedelta(minutes=15)
    email_n = data.courriel.strip().lower()
    recent = (
        db.query(Inscription)
        .filter(Inscription.course_id == course.id, Inscription.created_at >= since)
        .all()
    )

    for nom, enfant in lines:
        nom_n = nom.strip().lower()
        enfant_n = (enfant or "").strip()
        for row in recent:
            if (
                (row.nom or "").strip().lower() == nom_n
                and (row.courriel or "").strip().lower() == email_n
                and (row.enfant or "").strip() == enfant_n
            ):
                return InscriptionResponse(
                    **{k: getattr(row, k) for k in InscriptionResponse.model_fields
                       if k not in ("course_nom", "course_date", "inscription_ids", "count")},
                    course_nom=course.nom,
                    course_date=course.date_debut,
                )

    ids: list[int] = []
    try:
        for idx, (nom, enfant) in enumerate(lines):
            ins = Inscription(
                course_id=course.id,
                nom=nom,
                courriel=data.courriel,
                telephone=data.telephone,
                enfant=enfant,
                jour_prefere=data.jour_prefere if idx == 0 else None,
                horaire_prefere=data.horaire_prefere if idx == 0 else None,
                message=data.message if idx == 0 else None,
                newsletter=data.newsletter,
                est_membre=data.est_membre,
            )
            db.add(ins)
            db.flush()
            ids.append(ins.id)
        db.commit()
    except Exception:
        db.rollback()
        raise

    first = db.query(Inscription).filter(Inscription.id == ids[0]).first()
    return InscriptionResponse(
        **{k: getattr(first, k) for k in InscriptionResponse.model_fields
           if k not in ("course_nom", "course_date", "inscription_ids", "count")},
        course_nom=course.nom,
        course_date=course.date_debut,
        inscription_ids=ids,
        count=len(ids),
    )

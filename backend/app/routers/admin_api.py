"""Admin API: CRUD courses, list inscriptions, export CSV."""
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from app.models import Course, Inscription
from app.schemas import CourseCreate, CourseUpdate, CourseResponse, InscriptionResponse
from app.auth import get_current_admin, create_access_token, ADMIN_PASSWORD

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------- Login (no auth) ----------
from pydantic import BaseModel


class LoginRequest(BaseModel):
    password: str


@router.post("/login")
def admin_login(body: LoginRequest):
    if body.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    return {"access_token": create_access_token(), "token_type": "bearer"}


# ---------- Courses CRUD (protected) ----------
@router.get("/courses", response_model=list[CourseResponse])
def admin_list_courses(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    courses = db.query(Course).order_by(Course.discipline, Course.nom).all()
    result = []
    for c in courses:
        count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == c.id).scalar() or 0
        result.append(CourseResponse(
            **{k: getattr(c, k) for k in CourseResponse.model_fields if k != "places_restantes"},
            places_restantes=max(0, c.places_max - count)
        ))
    return result


@router.post("/courses", response_model=CourseResponse)
def admin_create_course(data: CourseCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    if db.query(Course).filter(Course.slug == data.slug).first():
        raise HTTPException(status_code=400, detail="Slug déjà utilisé")
    c = Course(**data.model_dump())
    db.add(c)
    db.commit()
    db.refresh(c)
    return CourseResponse(**{k: getattr(c, k) for k in CourseResponse.model_fields if k != "places_restantes"}, places_restantes=c.places_max)


@router.get("/courses/{id}", response_model=CourseResponse)
def admin_get_course(id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    c = db.query(Course).filter(Course.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == c.id).scalar() or 0
    return CourseResponse(**{k: getattr(c, k) for k in CourseResponse.model_fields if k != "places_restantes"}, places_restantes=max(0, c.places_max - count))


@router.put("/courses/{id}", response_model=CourseResponse)
def admin_update_course(id: int, data: CourseUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    c = db.query(Course).filter(Course.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    count = db.query(func.count(Inscription.id)).filter(Inscription.course_id == c.id).scalar() or 0
    return CourseResponse(**{k: getattr(c, k) for k in CourseResponse.model_fields if k != "places_restantes"}, places_restantes=max(0, c.places_max - count))


@router.delete("/courses/{id}")
def admin_delete_course(id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    c = db.query(Course).filter(Course.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ---------- Inscriptions (protected) ----------
@router.get("/inscriptions", response_model=list[InscriptionResponse])
def admin_list_inscriptions(
    course_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin)
):
    q = db.query(Inscription).order_by(Inscription.created_at.desc())
    if course_id is not None:
        q = q.filter(Inscription.course_id == course_id)
    inscriptions = q.all()
    return [
        InscriptionResponse(
            **{k: getattr(i, k) for k in InscriptionResponse.model_fields if k != "course_nom"},
            course_nom=i.course.nom
        )
        for i in inscriptions
    ]


@router.get("/inscriptions/export")
def admin_export_inscriptions(
    format: str = Query("csv", pattern="^(csv|json)$"),
    course_id: int | None = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_admin)
):
    q = db.query(Inscription).order_by(Inscription.created_at.desc())
    if course_id is not None:
        q = q.filter(Inscription.course_id == course_id)
    inscriptions = q.all()
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "date", "cours", "nom", "courriel", "téléphone", "enfant", "jour_préféré", "horaire_préféré", "message", "newsletter"])
        for i in inscriptions:
            writer.writerow([
                i.id,
                i.created_at.isoformat() if i.created_at else "",
                i.course.nom,
                i.nom,
                i.courriel,
                i.telephone or "",
                i.enfant or "",
                i.jour_prefere or "",
                i.horaire_prefere or "",
                (i.message or "").replace("\n", " "),
                "oui" if i.newsletter else "non",
            ])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=inscriptions.csv"}
        )
    raise HTTPException(status_code=400, detail="format must be csv")

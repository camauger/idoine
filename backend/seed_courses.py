"""Seed courses from horaire-printemps-2026.json and add intensifs."""
import json
import re
import sys
from pathlib import Path

# Run from backend/ — load .env so DATABASE_URL (e.g. Neon) is used
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))
from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from database import SessionLocal, init_db
from app.models import Course


def slugify(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    return s[:200]


def discipline_from_nom(nom: str) -> str:
    if "vitrail" in nom.lower():
        return "vitrail"
    if "mosaïque" in nom.lower() and "céramique" not in nom.lower():
        return "mosaique"
    return "ceramique"


def type_from_nom(nom: str) -> str:
    if "enfants" in nom.lower():
        return "enfants"
    return "regulier"


def _format_prix(prix: str | None, taxes: str | None) -> str | None:
    """Build display price from separate prix + taxes (from JSON)."""
    if not prix:
        return None
    if not taxes:
        return prix
    t = (taxes or "").strip().lower()
    if t == "en sus":
        return f"{prix} (taxes en sus)"
    if t == "non taxable":
        return f"{prix} non taxable"
    if t == "inclus":
        return f"{prix} (taxes incluses)"
    return f"{prix} {taxes}"


def main():
    init_db()
    db = SessionLocal()
    try:
        if db.query(Course).first():
            print("DB already has courses. Skip seed or delete DB first.")
            return
        # Load horaire Printemps 2026
        json_path = Path(__file__).parent.parent / "horaire-printemps-2026.json"
        if not json_path.exists():
            print("horaire-printemps-2026.json not found")
            return
        data = json.loads(json_path.read_text(encoding="utf-8"))
        seen = set()
        for i, c in enumerate(data["cours"]):
            nom = c["nom"]
            jour = c.get("jour", "")
            creneau = c.get("creneau", "")
            base_slug = slugify(nom) + "-" + slugify(jour) + "-" + slugify(creneau)
            slug = base_slug
            idx = 0
            while slug in seen:
                idx += 1
                slug = f"{base_slug}-{idx}"
            seen.add(slug)
            course = Course(
                nom=nom,
                slug=slug,
                discipline=discipline_from_nom(nom),
                type_cours=type_from_nom(nom),
                jour=jour,
                creneau=creneau or None,
                heure=c.get("heure"),
                duree_semaines=c.get("duree_semaines"),
                date_debut=c.get("debut"),
                places_max=c.get("places", 0),
                prix=_format_prix(c.get("prix"), c.get("taxes")),
                prof=c.get("prof"),
                salle=c.get("salle"),
                description=None,
                actif=True,
                badge_new=False,
            )
            db.add(course)
        # Intensifs (vitrail, mosaïque) from site
        intensifs = [
            {
                "nom": "Vitrail intensif – Niveau 1",
                "slug": "vitrail-intensif-niveau-1",
                "discipline": "vitrail",
                "type_cours": "intensif",
                "jour": "samedi",
                "heure": "13h-16h",
                "duree_semaines": None,
                "date_debut": "11 avril",
                "places_max": 6,
                "prix": "50$ (taxes incluses)",
                "prof": None,
                "salle": None,
                "description": "Colibri à suspendre, bases Tiffany.",
            },
            {
                "nom": "Vitrail intensif – Niveau 2",
                "slug": "vitrail-intensif-niveau-2",
                "discipline": "vitrail",
                "type_cours": "intensif",
                "jour": "samedi",
                "heure": "12h30-17h30",
                "duree_semaines": None,
                "date_debut": "2 mai",
                "places_max": 6,
                "prix": "65$ (taxes incluses)",
                "prof": None,
                "salle": None,
                "description": "Support à plantes en verre, technique Tiffany.",
            },
            {
                "nom": "Vitrail intensif – Niveau 2 (Pâques)",
                "slug": "vitrail-intensif-niveau-2-paques",
                "discipline": "vitrail",
                "type_cours": "intensif",
                "jour": "samedi",
                "heure": "9h-13h",
                "duree_semaines": None,
                "date_debut": "22 mars",
                "places_max": 4,
                "prix": "50$ (taxes incluses)",
                "prof": None,
                "salle": None,
                "description": "Projet thème Pâques, technique Tiffany.",
            },
            {
                "nom": "Mosaïque de verre",
                "slug": "mosaique-de-verre",
                "discipline": "mosaique",
                "type_cours": "intensif",
                "jour": "samedi / dimanche",
                "heure": "10h-15h",
                "duree_semaines": None,
                "date_debut": "7 et 15 mars",
                "places_max": 6,
                "prix": "50$ (taxes incluses)",
                "prof": "Guy Frève",
                "salle": None,
                "description": "Mosaïque de verre, matériel inclus.",
                "page_dediee": "mosaique-verre",
            },
        ]
        for d in intensifs:
            if db.query(Course).filter(Course.slug == d["slug"]).first():
                continue
            db.add(Course(actif=True, badge_new=False, **d))
        db.commit()
        print("Seed OK:", db.query(Course).count(), "courses")
    finally:
        db.close()


if __name__ == "__main__":
    main()

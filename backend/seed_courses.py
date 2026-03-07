"""Seed courses from horaire-printemps-2026.json and add intensifs.

Usage:
    python seed_courses.py          # Initial seed (fails if DB has courses)
    python seed_courses.py --update # Add only new courses (skip existing)
"""
import argparse
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
    parser = argparse.ArgumentParser(description="Seed courses to database")
    parser.add_argument(
        "--update",
        action="store_true",
        help="Add only new courses (skip existing by slug)",
    )
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    added = 0
    skipped = 0
    try:
        existing_count = db.query(Course).count()
        if existing_count > 0 and not args.update:
            print(f"DB already has {existing_count} courses.")
            print("Use --update to add only new courses, or delete DB first.")
            return
        if args.update:
            print(f"Mode update: {existing_count} cours existants")
        # Load horaire Printemps 2026
        json_path = Path(__file__).parent.parent / "horaire-printemps-2026.json"
        if not json_path.exists():
            print("horaire-printemps-2026.json not found")
            return
        data = json.loads(json_path.read_text(encoding="utf-8"))
        seen = set()
        for i, c in enumerate(data["cours"]):
            # Skip non-active courses
            if c.get("statut", "actif") != "actif":
                print(f"  Skipping inactive: {c.get('nom', 'unknown')}")
                continue
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
            # Check if course already exists
            if db.query(Course).filter(Course.slug == slug).first():
                skipped += 1
                continue
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
            added += 1
            print(f"  + {nom}")
        # Intensifs (vitrail, mosaïque) from intensifs.json
        intensifs_path = Path(__file__).parent.parent / "intensifs.json"
        if intensifs_path.exists():
            intensifs_data = json.loads(intensifs_path.read_text(encoding="utf-8"))
            intensifs = intensifs_data.get("intensifs", [])
        else:
            print("intensifs.json not found, skipping intensifs")
            intensifs = []
        for d in intensifs:
            # Skip non-active courses
            if d.get("statut", "actif") != "actif":
                print(f"  Skipping inactive: {d['slug']}")
                continue
            if db.query(Course).filter(Course.slug == d["slug"]).first():
                skipped += 1
                continue
            # Process intensif data - handle taxes and statut fields
            prix_formatted = _format_prix(d.get("prix"), d.get("taxes"))
            course = Course(
                nom=d["nom"],
                slug=d["slug"],
                discipline=d.get("discipline", "ceramique"),
                type_cours=d.get("type_cours", "intensif"),
                jour=d.get("jour"),
                creneau=d.get("creneau"),
                heure=d.get("heure"),
                duree_semaines=d.get("duree_semaines"),
                date_debut=d.get("date_debut"),
                places_max=d.get("places_max", 0),
                prix=prix_formatted,
                prof=d.get("prof"),
                salle=d.get("salle"),
                description=d.get("description"),
                actif=True,
                badge_new=d.get("badge_new", False),
                page_dediee=d.get("page_dediee"),
            )
            db.add(course)
            added += 1
            print(f"  + {d['nom']}")
        db.commit()
        total = db.query(Course).count()
        print(f"\nRésultat: {added} ajoutés, {skipped} ignorés (existants)")
        print(f"Total en BD: {total} cours")
    finally:
        db.close()


if __name__ == "__main__":
    main()

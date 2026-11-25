"""Ajoute la colonne debut_le (DATE) à courses et la remplit depuis date_debut. Exécuter depuis backend/.

date_debut reste le libellé affiché (« 11 Janvier », « 15 et 29 Novembre ») et la clé de
rapprochement des inscriptions (submission-created.js) : on ne le touche pas.
debut_le sert au tri et au masquage des ateliers intensifs passés.

Remplissage : seulement les lignes où debut_le est vide. L'année est déduite de l'année
scolaire en cours (août → juillet) : un mois d'août à décembre tombe sur l'année où elle
commence, un mois de janvier à juillet sur la suivante.

    python migrate_add_debut_le.py            # ajoute la colonne, affiche le remplissage prévu
    python migrate_add_debut_le.py --apply    # ajoute la colonne et remplit
"""
import argparse
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))
from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from sqlalchemy import text

from database import engine

MOIS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout",
        "septembre", "octobre", "novembre", "decembre"]


def sans_accents(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn").strip()


def deduire_date(libelle: str | None, aujourd_hui: date) -> date | None:
    """« 15 et 29 Novembre » → premier jour ; « 27 Juin 2026 » → année explicite."""
    s = sans_accents(libelle or "")
    jour = re.search(r"\b(\d{1,2})\b", s)
    mois = next((i + 1 for i, nom in enumerate(MOIS) if nom in s), None)
    if not jour or not mois:
        return None
    annee_explicite = re.search(r"\b(20\d{2})\b", s)
    if annee_explicite:
        annee = int(annee_explicite.group(1))
    else:
        debut_scolaire = aujourd_hui.year if aujourd_hui.month >= 8 else aujourd_hui.year - 1
        annee = debut_scolaire if mois >= 8 else debut_scolaire + 1
    try:
        return date(annee, mois, int(jour.group(1)))
    except ValueError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="écrire le remplissage (sinon aperçu)")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # console Windows (cp1252) : accents et flèches

    print(f"Base : {engine.url.host or engine.url.database}")
    with engine.connect() as conn:
        if engine.dialect.name == "sqlite":
            names = {row[1] for row in conn.execute(text("PRAGMA table_info(courses)")).fetchall()}
            if "debut_le" not in names:
                conn.execute(text("ALTER TABLE courses ADD COLUMN debut_le DATE"))
        else:
            conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS debut_le DATE"))
        conn.commit()
        print("Colonne debut_le présente.")

        rows = conn.execute(text(
            "SELECT id, nom, date_debut FROM courses WHERE debut_le IS NULL ORDER BY id"
        )).fetchall()
        aujourd_hui = date.today()
        prevus = []
        for id_, nom, libelle in rows:
            d = deduire_date(libelle, aujourd_hui)
            prevus.append((id_, d))
            print(f"  {id_:>4}  {(libelle or '—'):<22} → {d.isoformat() if d else 'illisible, laissé vide'}  {nom}")

        if not args.apply:
            print(f"\nAperçu seulement ({len(rows)} ligne(s)). Relancer avec --apply pour écrire.")
            return
        n = 0
        for id_, d in prevus:
            if d:
                conn.execute(text("UPDATE courses SET debut_le = :d WHERE id = :id AND debut_le IS NULL"),
                             {"d": d, "id": id_})
                n += 1
        conn.commit()
        print(f"\nRemplissage OK : {n} ligne(s) écrite(s).")


if __name__ == "__main__":
    main()

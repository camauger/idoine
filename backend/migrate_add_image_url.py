"""Migration : ajouter image_url aux cours (URL optionnelle, chemins site ex. /assets/images/...)."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from sqlalchemy import text
from database import engine, DATABASE_URL


def run():
    with engine.begin() as conn:
        if DATABASE_URL.startswith("postgresql"):
            conn.execute(
                text(
                    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_url VARCHAR(512)"
                )
            )
        else:
            r = conn.execute(text("PRAGMA table_info(courses)"))
            cols = [row[1] for row in r]
            if "image_url" not in cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN image_url VARCHAR(512)"))
    print("Migration OK: colonne image_url prête.")


if __name__ == "__main__":
    run()

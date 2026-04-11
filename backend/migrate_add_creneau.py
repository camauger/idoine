"""One-off migration: add creneau column to courses if missing. Run from backend/."""
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
            conn.execute(text(
                "ALTER TABLE courses ADD COLUMN IF NOT EXISTS creneau VARCHAR(50)"
            ))
        else:
            r = conn.execute(text("PRAGMA table_info(courses)"))
            cols = [row[1] for row in r]
            if "creneau" not in cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN creneau VARCHAR(50)"))
    print("Migration OK: colonne creneau prête.")

if __name__ == "__main__":
    run()

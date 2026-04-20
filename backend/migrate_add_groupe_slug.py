"""Ajoute la colonne groupe_slug à courses (sessions regroupées). Exécuter depuis backend/."""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))
from dotenv import load_dotenv

load_dotenv(backend_dir / ".env")

from sqlalchemy import text

from database import engine


def main() -> None:
    with engine.connect() as conn:
        if engine.dialect.name == "sqlite":
            cols = conn.execute(text("PRAGMA table_info(courses)")).fetchall()
            names = {row[1] for row in cols}
            if "groupe_slug" not in names:
                conn.execute(text("ALTER TABLE courses ADD COLUMN groupe_slug VARCHAR(255)"))
                conn.commit()
                print("Migration OK: groupe_slug ajouté (SQLite).")
            else:
                print("Colonne groupe_slug déjà présente.")
        else:
            conn.execute(
                text(
                    "ALTER TABLE courses ADD COLUMN IF NOT EXISTS groupe_slug VARCHAR(255)"
                )
            )
            conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_courses_groupe_slug ON courses (groupe_slug)"
                )
            )
            conn.commit()
            print("Migration OK: groupe_slug (Postgres).")


if __name__ == "__main__":
    main()

"""Vider les tables courses et inscriptions. Run from backend/."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from database import SessionLocal
from app.models import Course, Inscription

def main():
    db = SessionLocal()
    try:
        n_inscriptions = db.query(Inscription).delete()
        n_courses = db.query(Course).delete()
        db.commit()
        print(f"Base vidée : {n_courses} cours et {n_inscriptions} inscriptions supprimés.")
        print("Tu peux relancer : python seed_courses.py")
    finally:
        db.close()

if __name__ == "__main__":
    main()

"""Database configuration and session."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Netlify + Neon fournissent NETLIFY_DATABASE_URL (pooled) et NETLIFY_DATABASE_URL_UNPOOLED
# En local ou ailleurs : DATABASE_URL
DATABASE_URL = (
    os.getenv("NETLIFY_DATABASE_URL")
    or os.getenv("NETLIFY_DATABASE_URL_UNPOOLED")
    or os.getenv("DATABASE_URL")
    or "sqlite:///./atelier_cours.db"
)
# Neon et certains hébergeurs fournissent postgres:// ; SQLAlchemy 2 attend postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {} if DATABASE_URL.startswith("postgresql") else {"check_same_thread": False}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables."""
    from app.models import Course, Inscription  # noqa: F401
    Base.metadata.create_all(bind=engine)

"""Atelier St-Elme API - courses and inscriptions."""
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from database import init_db
from app.routers import public
from app.routers import admin_api

CORS_ORIGINS = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:9000,http://127.0.0.1:3000,http://127.0.0.1:5500,http://127.0.0.1:9000"
).split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Atelier St-Elme API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(admin_api.router)


@app.get("/")
def root():
    return {"message": "Atelier St-Elme API", "docs": "/docs"}


@app.get("/admin", response_class=HTMLResponse)
def admin_page():
    path = Path(__file__).parent / "app" / "templates" / "admin.html"
    return path.read_text(encoding="utf-8")

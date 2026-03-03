from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models
import schemas
from routers import auth, users, modelle, gelaende, flugeintraege

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MFG Kitzingen Flugbuch API",
    description="Backend-API für das digitale Modellflugbuch der MFG Kitzingen e.V.",
    version="0.2.0"
)

# CORS setup for Web Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "MFG Kitzingen Flugbuch API läuft"}

# Include API Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(modelle.router)
app.include_router(gelaende.router)
app.include_router(flugeintraege.router)

import os
import sys

# Adjust sys.path so that `ml` package can be imported from the backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.models import User, Location, CrimeRecord, Alert  # noqa: F401
from app.routers import auth, predictions, map_data, citizen, police, municipal, emergency


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and pre-load ML models
    Base.metadata.create_all(bind=engine)
    try:
        from ml.predict import _ModelStore
        _ModelStore.get()
        print("ML models loaded successfully.")
    except Exception as e:
        print(f"Warning: Could not pre-load ML models: {e}")
    yield
    # Shutdown
    print("Application shutting down.")


app = FastAPI(
    title="OpCrime AI",
    description="AI-powered crime prediction and safe city platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - allow web, Android emulator and Capacitor origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        "http://10.0.2.2:3000",
        "http://10.0.2.2:8001",
        "capacitor://localhost",
        "http://localhost",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(predictions.router)
app.include_router(map_data.router)
app.include_router(citizen.router)
app.include_router(police.router)
app.include_router(municipal.router)
app.include_router(emergency.router)


@app.get("/", tags=["health"])
def root():
    return {"status": "ok", "app": "OpCrime AI", "version": "1.0.0"}


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "healthy"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CATALOG_DIR, IDF_DIR, WEATHER_DIR, SIMULATION_ROOT
from app.routes.health import router as health_router
from app.routes.overview import router as overview_router
from app.routes.simulation import router as simulation_router
from app.routes.thermal_comfort import router as thermal_comfort_router

# Create FastAPI app instance
app = FastAPI()

# Set up CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://upat-nzc-energyplus.vercel.app",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# On FastAPI app start, ensure that necessary directories exist
@app.on_event("startup")
def startup_checks():
    CATALOG_DIR.mkdir(parents=True, exist_ok=True)      # Dirctory for room catalog data
    WEATHER_DIR.mkdir(parents=True, exist_ok=True)      # Directory for weather files (EPW)
    IDF_DIR.mkdir(parents=True, exist_ok=True)          # Directory for EnergyPlus IDF files
    SIMULATION_ROOT.mkdir(parents=True, exist_ok=True)  # Directory for simulation runs

# Include `health` and `simulation` API routers for the FastAPI app
app.include_router(health_router)
app.include_router(overview_router)
app.include_router(simulation_router)
app.include_router(thermal_comfort_router)

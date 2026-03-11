from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import IDF_DIR, WEATHER_DIR, SIMULATION_ROOT
from app.routes.health import router as health_router
from app.routes.simulation import router as simulation_router

app = FastAPI()

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

@app.on_event("startup")
def startup_checks():
    IDF_DIR.mkdir(parents=True, exist_ok=True)
    WEATHER_DIR.mkdir(parents=True, exist_ok=True)
    SIMULATION_ROOT.mkdir(parents=True, exist_ok=True)

app.include_router(health_router)
app.include_router(simulation_router)

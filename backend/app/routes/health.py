from fastapi import APIRouter

from app.config import (
    IDF_DIR,
    WEATHER_DIR,
    SIMULATION_ROOT,
    RESOURCES_DIR,
    ENERGYPLUS_ROOT,
    ENERGYPLUS_IDD,
    ENERGYPLUS_EXE,
)

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok"}

@router.get("/debug/paths")
def debug_paths():
    idf_files = [p.name for p in IDF_DIR.glob("*.idf")]
    weather_files = [p.name for p in WEATHER_DIR.glob("*.epw")]

    return {
        "resources_dir": str(RESOURCES_DIR),
        "idf_dir": str(IDF_DIR),
        "weather_dir": str(WEATHER_DIR),
        "simulation_root": str(SIMULATION_ROOT),
        "energyplus_root": str(ENERGYPLUS_ROOT),
        "energyplus_exe": str(ENERGYPLUS_EXE),
        "energyplus_idd": str(ENERGYPLUS_IDD),
        "idf_dir_exists": IDF_DIR.exists(),
        "weather_dir_exists": WEATHER_DIR.exists(),
        "simulation_root_exists": SIMULATION_ROOT.exists(),
        "energyplus_root_exists": ENERGYPLUS_ROOT.exists(),
        "energyplus_exe_exists": ENERGYPLUS_EXE.exists(),
        "energyplus_idd_exists": ENERGYPLUS_IDD.exists(),
        "idf_files": idf_files,
        "weather_files": weather_files,
    }
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"

RESOURCES_DIR = BASE_DIR / "resources"
IDF_DIR = RESOURCES_DIR / "idf"
WEATHER_DIR = RESOURCES_DIR / "weather"

SIMULATION_ROOT = BASE_DIR / "simulation_runs"
SIMULATION_ROOT.mkdir(exist_ok=True)

ENERGYPLUS_ROOT = Path(os.getenv("ENERGYPLUS_ROOT", "/opt/EnergyPlus-25-2-0"))
ENERGYPLUS_IDD = Path(os.getenv("ENERGYPLUS_IDD", "/opt/EnergyPlus-25-2-0/Energy+.idd"))
ENERGYPLUS_EXE = ENERGYPLUS_ROOT / "energyplus"
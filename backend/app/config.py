from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"

RESOURCES_DIR = BASE_DIR / "resources"
CATALOG_DIR = RESOURCES_DIR / "catalog"
IDF_DIR = RESOURCES_DIR / "idf"
WEATHER_DIR = RESOURCES_DIR / "weather"

SIMULATION_ROOT = BASE_DIR / "simulation_runs"
SIMULATION_ROOT.mkdir(exist_ok=True)

ENERGYPLUS_ROOT = Path(os.getenv("ENERGYPLUS_ROOT", "/opt/EnergyPlus-25-2-0"))
ENERGYPLUS_IDD = Path(os.getenv("ENERGYPLUS_IDD", "/opt/EnergyPlus-25-2-0/Energy+.idd"))
ENERGYPLUS_EXE = ENERGYPLUS_ROOT / "energyplus"

DEVICE_API_BASE_URL = os.getenv("DEVICE_API_BASE_URL", "http://65.21.106.41:8000")
DEVICE_API_TIMEOUT_SECONDS = float(os.getenv("DEVICE_API_TIMEOUT_SECONDS", "5"))

# Hours to add to measurement timestamps (stored without timezone) for display in user's local time.
_def_tz = os.getenv("MEASUREMENT_TZ_OFFSET_HOURS", "2")
try:
    MEASUREMENT_TZ_OFFSET_HOURS = int(_def_tz)
except (ValueError, TypeError):
    MEASUREMENT_TZ_OFFSET_HOURS = 2

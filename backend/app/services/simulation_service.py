import json
import shutil
from datetime import datetime
from uuid import uuid4

from app.config import SIMULATION_ROOT, IDF_DIR, WEATHER_DIR
from app.schemas import SimulationInput
from app.services.energyplus_service import execute_energyplus
from app.services.idf_service import apply_setpoint_schedule_updates, apply_zone_occupancy_updates
from app.services.results_service import extract_results

def run_simulation(sim_input: SimulationInput):
    run_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
    run_dir = SIMULATION_ROOT / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    input_data = sim_input.model_dump()

    with open(run_dir / "inputs.json", "w", encoding="utf-8") as f:
        json.dump(input_data, f, indent=2)

    idf_files = list(IDF_DIR.glob("*.idf"))
    weather_files = list(WEATHER_DIR.glob("*.epw"))

    if not idf_files:
        raise FileNotFoundError("No IDF file found in resources/idf")
    if not weather_files:
        raise FileNotFoundError("No EPW file found in resources/weather")

    base_idf = idf_files[0]
    base_weather = weather_files[0]

    run_idf = run_dir / base_idf.name
    run_weather = run_dir / base_weather.name
    prepared_idf = run_dir / "in.idf"

    shutil.copy2(base_idf, run_idf)
    shutil.copy2(base_weather, run_weather)
    shutil.copy2(base_idf, prepared_idf)

    schedule_edits = apply_setpoint_schedule_updates(
        str(prepared_idf),
        sim_input.heating_setpoint,
        sim_input.cooling_setpoint,
    )

    occupancy_edits = apply_zone_occupancy_updates(
        str(prepared_idf),
        sim_input.zone_occupancy.model_dump(),
    )

    energyplus_result = execute_energyplus(
        idf_path=str(prepared_idf),
        weather_path=str(run_weather),
        output_dir=str(run_dir),
    )

    with open(run_dir / "preprocess_summary.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "message": "Setpoint and occupancy preprocessing completed",
                "source_model": base_idf.name,
                "prepared_model": prepared_idf.name,
                "applied_inputs": input_data,
                "schedule_edits": schedule_edits,
                "occupancy_edits": occupancy_edits,
            },
            f,
            indent=2,
        )

    with open(run_dir / "execution_summary.json", "w", encoding="utf-8") as f:
        json.dump(energyplus_result, f, indent=2)

    results = None
    if energyplus_result["success"]:
        results = extract_results(str(run_dir / "eplusout.sql"))

        with open(run_dir / "results_summary.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

    return {
        "status": "success" if energyplus_result["success"] else "failed",
        "simulation_engine": "energyplus",
        "run_id": run_id,
        "run_dir": str(run_dir),
        "inputs": input_data,
        "files": {
            "base_idf": str(base_idf),
            "base_weather": str(base_weather),
            "run_idf": str(run_idf),
            "run_weather": str(run_weather),
            "prepared_idf": str(prepared_idf),
        },
        "preprocess": {
            "schedule_edits": schedule_edits,
            "occupancy_edits": occupancy_edits,
        },
        "execution": {
            "success": energyplus_result["success"],
            "returncode": energyplus_result["returncode"],
            "expected_outputs": energyplus_result["expected_outputs"],
        },
        "results": results,
    }
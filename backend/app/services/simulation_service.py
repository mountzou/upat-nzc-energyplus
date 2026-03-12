import json
import shutil
from datetime import datetime
from uuid import uuid4

from app.config import SIMULATION_ROOT, WEATHER_DIR
from app.schemas import SimulationInput
from app.services.energyplus_service import execute_energyplus
from app.services.idf_service import (
    apply_people_object_occupancy_update,
    apply_room_setpoint_updates,
)
from app.services.room_catalog_service import get_room_by_id
from app.services.results_service import extract_results

def _prepare_weather_file(run_dir):
    weather_files = list(WEATHER_DIR.glob("*.epw"))
    if not weather_files:
        raise FileNotFoundError("No EPW file found in resources/weather")

    base_weather = weather_files[0]
    run_weather = run_dir / base_weather.name
    shutil.copy2(base_weather, run_weather)
    return base_weather, run_weather


def _run_room_simulation(parent_run_dir, school_id, room_input, base_weather):
    room = get_room_by_id(school_id, room_input.room_id)
    if room is None:
        raise ValueError(
            f"Unknown room_id '{room_input.room_id}' for school_id '{school_id}'"
        )
    if not room["idf_exists"]:
        raise FileNotFoundError(f"IDF file not found for room '{room_input.room_id}'")

    effective_cooling_setpoint = room_input.cooling_setpoint
    if not room["supports"]["cooling_setpoint"]:
        effective_cooling_setpoint = None

    room_dir = parent_run_dir / room_input.room_id
    room_dir.mkdir(parents=True, exist_ok=True)

    base_idf = room["idf_path"]
    run_idf = room_dir / room["idf_file"]
    run_weather = room_dir / base_weather.name
    prepared_idf = room_dir / "in.idf"

    shutil.copy2(base_idf, run_idf)
    shutil.copy2(base_weather, run_weather)
    shutil.copy2(base_idf, prepared_idf)

    schedule_edits = apply_room_setpoint_updates(
        idf_path=str(prepared_idf),
        heating_schedule_name=room["heating_schedule_name"],
        heating_setpoint=room_input.heating_setpoint,
        cooling_schedule_name=room["cooling_schedule_name"],
        cooling_setpoint=effective_cooling_setpoint,
    )

    occupancy_edit = apply_people_object_occupancy_update(
        idf_path=str(prepared_idf),
        people_object_name=room["people_object_name"],
        occupancy=room_input.occupancy,
    )

    energyplus_result = execute_energyplus(
        idf_path=str(prepared_idf),
        weather_path=str(run_weather),
        output_dir=str(room_dir),
    )

    room_input_data = room_input.model_dump()
    applied_input_data = {**room_input_data, "cooling_setpoint": effective_cooling_setpoint}

    with open(room_dir / "preprocess_summary.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "message": "Setpoint and occupancy preprocessing completed",
                "room": room,
                "source_model": room["idf_file"],
                "prepared_model": prepared_idf.name,
                "applied_inputs": applied_input_data,
                "schedule_edits": schedule_edits,
                "occupancy_edit": occupancy_edit,
            },
            f,
            indent=2,
        )

    with open(room_dir / "execution_summary.json", "w", encoding="utf-8") as f:
        json.dump(energyplus_result, f, indent=2)

    results = None
    if energyplus_result["success"]:
        results = extract_results(str(room_dir / "eplusout.sql"))
        with open(room_dir / "results_summary.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

    return {
        "room_id": room["id"],
        "room_label": room["label"],
        "status": "success" if energyplus_result["success"] else "failed",
        "room_dir": str(room_dir),
        "room": room,
        "inputs": applied_input_data,
        "files": {
            "base_idf": base_idf,
            "base_weather": str(base_weather),
            "run_idf": str(run_idf),
            "run_weather": str(run_weather),
            "prepared_idf": str(prepared_idf),
        },
        "preprocess": {
            "schedule_edits": schedule_edits,
            "occupancy_edit": occupancy_edit,
        },
        "execution": {
            "success": energyplus_result["success"],
            "returncode": energyplus_result["returncode"],
            "expected_outputs": energyplus_result["expected_outputs"],
        },
        "results": results,
    }


def run_simulation(sim_input: SimulationInput):
    run_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
    run_dir = SIMULATION_ROOT / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    input_data = sim_input.model_dump()
    with open(run_dir / "inputs.json", "w", encoding="utf-8") as f:
        json.dump(input_data, f, indent=2)

    base_weather, _ = _prepare_weather_file(run_dir)

    room_runs = []
    for room_input in sim_input.rooms:
        try:
            room_runs.append(
                _run_room_simulation(
                    run_dir, sim_input.school_id, room_input, base_weather
                )
            )
        except Exception as exc:
            room_runs.append(
                {
                    "room_id": room_input.room_id,
                    "room_label": room_input.room_id,
                    "status": "failed",
                    "inputs": room_input.model_dump(),
                    "error": str(exc),
                    "execution": {
                        "success": False,
                        "returncode": None,
                        "expected_outputs": None,
                    },
                    "results": None,
                }
            )

    success_count = sum(1 for room_run in room_runs if room_run["execution"]["success"])
    failure_count = len(room_runs) - success_count

    if success_count == len(room_runs):
        status = "success"
    elif success_count == 0:
        status = "failed"
    else:
        status = "partial_success"

    return {
        "status": status,
        "simulation_engine": "energyplus",
        "run_id": run_id,
        "run_dir": str(run_dir),
        "inputs": input_data,
        "school_id": sim_input.school_id,
        "summary": {
            "requested_rooms": len(sim_input.rooms),
            "successful_rooms": success_count,
            "failed_rooms": failure_count,
        },
        "room_runs": room_runs,
    }

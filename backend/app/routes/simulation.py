from fastapi import APIRouter, Query

from app.config import IDF_DIR
from app.schemas import RoomMetadata, SchoolMetadata, SimulationInput
from app.services.idf_service import (
    inspect_idf,
    inspect_thermostat,
    inspect_schedule_by_name,
    inspect_people_objects,
)
from app.services.room_catalog_service import list_rooms, list_schools
from app.services.simulation_service import run_simulation

router = APIRouter()

@router.post("/simulate")
def simulate(sim_input: SimulationInput):
    return run_simulation(sim_input)


@router.get("/schools", response_model=list[SchoolMetadata])
def get_schools():
    return list_schools()


@router.get("/rooms", response_model=list[RoomMetadata])
def get_rooms(school_id: str = Query(...)):
    return list_rooms(school_id)

@router.get("/debug/idf")
def debug_idf():
    idf_files = list(IDF_DIR.glob("*.idf"))
    if not idf_files:
        return {"error": "No IDF file found"}
    return inspect_idf(str(idf_files[0]))

@router.get("/debug/thermostat")
def debug_thermostat():
    idf_files = list(IDF_DIR.glob("*.idf"))
    if not idf_files:
        return {"error": "No IDF file found"}
    return inspect_thermostat(str(idf_files[0]))

@router.get("/debug/schedule/heating")
def debug_heating_schedule():
    idf_files = list(IDF_DIR.glob("*.idf"))
    if not idf_files:
        return {"error": "No IDF file found"}
    return inspect_schedule_by_name(str(idf_files[0]), "Htg-SetP-Sch")

@router.get("/debug/schedule/cooling")
def debug_cooling_schedule():
    idf_files = list(IDF_DIR.glob("*.idf"))
    if not idf_files:
        return {"error": "No IDF file found"}
    return inspect_schedule_by_name(str(idf_files[0]), "Clg-SetP-Sch")

@router.get("/debug/people")
def debug_people():
    idf_files = list(IDF_DIR.glob("*.idf"))
    if not idf_files:
        return {"error": "No IDF file found"}
    return inspect_people_objects(str(idf_files[0]))

from fastapi import APIRouter, Query

from app.schemas import RoomMetadata, SchoolMetadata, SimulationInput
from app.services.service_room_catalog import list_rooms, list_schools
from app.services.service_simulation import run_simulation

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

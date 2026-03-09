from pydantic import BaseModel

class ZoneOccupancy(BaseModel):
    Classroom_Left: int
    Classroom_Right: int
    Room2_Small: int
    Hallway_Room3: int


class SimulationInput(BaseModel):
    heating_setpoint: float
    cooling_setpoint: float
    zone_occupancy: ZoneOccupancy
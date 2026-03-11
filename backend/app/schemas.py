from pydantic import BaseModel

class RoomSimulationInput(BaseModel):
    room_id: str
    occupancy: int
    heating_setpoint: float
    cooling_setpoint: float | None = None


class SimulationInput(BaseModel):
    rooms: list[RoomSimulationInput]


class RoomSupports(BaseModel):
    occupancy: bool
    heating_setpoint: bool
    cooling_setpoint: bool


class RoomDefaults(BaseModel):
    occupancy: int
    heating_setpoint: float
    cooling_setpoint: float | None = None


class RoomStaticSchedules(BaseModel):
    occupancy: str | None = None
    lighting: str | None = None
    equipment: str | None = None
    heating_availability: str | None = None
    hvac_availability: str | None = None
    thermostat_control: str | None = None
    secondary_thermostat_control: str | None = None
    ventilation: str | None = None
    activity: str | None = None
    heating_setpoint: str | None = None
    cooling_setpoint: str | None = None
    outdoor_co2: str | None = None


class RoomMetadata(BaseModel):
    id: str
    label: str
    idf_file: str
    idf_path: str
    idf_exists: bool
    zone_name: str
    people_object_name: str
    occupancy_schedule_name: str
    thermostat_type: str
    heating_schedule_name: str
    cooling_schedule_name: str | None = None
    supports: RoomSupports
    defaults: RoomDefaults
    static_schedules: RoomStaticSchedules

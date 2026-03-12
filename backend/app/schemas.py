from typing import Literal

from pydantic import BaseModel, model_validator

class RoomSimulationInput(BaseModel):
    room_id: str
    occupancy: int
    heating_setpoint: float
    cooling_setpoint: float | None = None


class SimulationInput(BaseModel):
    school_id: str
    rooms: list[RoomSimulationInput]


class SchoolMetadata(BaseModel):
    id: str
    label: str


class SchoolCatalogEntry(SchoolMetadata):
    pass


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


class RoomCatalogEntry(BaseModel):
    id: str
    label: str
    idf_file: str
    zone_name: str
    people_object_name: str
    occupancy_schedule_name: str
    thermostat_type: Literal["single_heating", "dual_setpoint"]
    heating_schedule_name: str
    cooling_schedule_name: str | None = None
    supports: RoomSupports
    defaults: RoomDefaults
    static_schedules: RoomStaticSchedules

    @model_validator(mode="after")
    def validate_cooling_configuration(self):
        if self.supports.cooling_setpoint and self.cooling_schedule_name is None:
            raise ValueError(
                "cooling_schedule_name is required when cooling_setpoint is supported"
            )
        if (
            not self.supports.cooling_setpoint
            and self.defaults.cooling_setpoint is not None
        ):
            raise ValueError(
                "defaults.cooling_setpoint must be null when cooling_setpoint is unsupported"
            )
        if (
            self.thermostat_type == "dual_setpoint"
            and self.defaults.cooling_setpoint is not None
            and self.defaults.heating_setpoint >= self.defaults.cooling_setpoint
        ):
            raise ValueError(
                "defaults.heating_setpoint must be lower than defaults.cooling_setpoint for dual_setpoint rooms"
            )
        return self


class RoomMetadata(BaseModel):
    school_id: str
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

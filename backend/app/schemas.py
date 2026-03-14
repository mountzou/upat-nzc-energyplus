from datetime import datetime
from typing import Literal

from pydantic import BaseModel, model_validator

# Schema for SchoolMetadata, which defines the metadata for a school in the room catalog.
class SchoolMetadata(BaseModel):
    id: str
    label: str

# Schema for RoomSupports, which defines the supported features of a room in the catalog.
class RoomSupports(BaseModel):
    occupancy: bool
    heating_setpoint: bool
    cooling_setpoint: bool

# Schema for RoomDefaults, which defines the default simulation parameters for a room in the catalog.
class RoomDefaults(BaseModel):
    occupancy: int
    heating_setpoint: float
    cooling_setpoint: float | None = None
    
# Schema for RoomSimulationInput, which defines the input parameters for simulating a room.
class RoomSimulationInput(BaseModel):
    room_id: str
    occupancy: int
    heating_setpoint: float
    cooling_setpoint: float | None = None

# Schema for SimulationInput, which defines the input parameters for a simulation.
class SimulationInput(BaseModel):
    school_id: str
    rooms: list[RoomSimulationInput]

# Schema for RoomStaticSchedules, which defines the static schedule names for a room in the catalog.
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

# Schema for RoomCatalogEntry, which defines the metadata and configuration for a room in the catalog.
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

# Schema for RoomMetadata, which extends RoomCatalogEntry with additional metadata fields for API responses.
class RoomMetadata(RoomCatalogEntry):
    school_id: str
    idf_path: str
    idf_exists: bool


class DeviceLatestMetricRow(BaseModel):
    device_id: str
    metric: str
    value: float | int
    unit: str | None = None
    event_time: datetime


class OverviewReading(BaseModel):
    value: float | int
    unit: str | None = None


class DeviceLatestOverviewResponse(BaseModel):
    device_id: str
    latest_event_time: datetime
    readings: dict[str, OverviewReading]


class DeviceHistoryBucketItem(BaseModel):
    device_id: str
    event_time: datetime
    measurements: dict[str, OverviewReading]


class DeviceHistoryResponse(BaseModel):
    device_id: str
    count: int
    items: list[DeviceHistoryBucketItem]


class SchoolDeviceMetadata(BaseModel):
    id: str
    label: str


class SchoolDeviceCatalogEntry(BaseModel):
    school_id: str
    devices: list[SchoolDeviceMetadata]

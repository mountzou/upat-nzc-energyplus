from fastapi import APIRouter, Query

from app.schemas import (
    ComfortGridResponse,
    DeviceHistoryResponse,
    DeviceLatestOverviewResponse,
    SchoolDeviceMetadata,
)
from app.services.service_device_catalog import list_devices_for_school
from app.services.service_overview import (
    get_comfort_grid,
    get_device_history,
    get_device_latest_overview,
)

router = APIRouter()


@router.get(
    "/overview/devices/{device_id}/latest",
    response_model=DeviceLatestOverviewResponse,
)
def get_overview_device_latest(device_id: str):
    return get_device_latest_overview(device_id)


@router.get(
    "/overview/schools/{school_id}/devices",
    response_model=list[SchoolDeviceMetadata],
)
def get_overview_school_devices(school_id: str):
    return list_devices_for_school(school_id)


@router.get(
    "/overview/devices/{device_id}/history",
    response_model=DeviceHistoryResponse,
)
def get_overview_device_history(
    device_id: str,
    aggregate: str = Query("avg"),
    bucket_unit: str = Query("hour"),
    bucket_size: int = Query(1, ge=1, le=1000),
    limit: int = Query(24, ge=1, le=1000),
):
    return get_device_history(
        device_id,
        aggregate=aggregate,
        bucket_unit=bucket_unit,
        bucket_size=bucket_size,
        limit=limit,
    )


@router.get(
    "/overview/devices/{device_id}/comfort-grid",
    response_model=ComfortGridResponse,
)
def get_overview_comfort_grid(device_id: str):
    """PMV thermal comfort 5×12 grid (weekday × hour 06:00–17:00) from last 30 days."""
    did, grid = get_comfort_grid(device_id)
    return ComfortGridResponse(device_id=did, grid=grid)

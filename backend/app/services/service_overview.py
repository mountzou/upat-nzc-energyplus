import logging

from fastapi import HTTPException
from pydantic import TypeAdapter, ValidationError

from app.schemas import (
    DeviceHistoryResponse,
    DeviceLatestMetricRow,
    DeviceLatestOverviewResponse,
    OverviewReading,
)
from app.services.service_device_api import fetch_device_history
from app.services.service_device_api import fetch_device_latest

logger = logging.getLogger(__name__)

metric_rows_adapter = TypeAdapter(list[DeviceLatestMetricRow])


def get_device_latest_overview(device_id: str) -> DeviceLatestOverviewResponse:
    payload = fetch_device_latest(device_id)

    try:
        latest_history = DeviceHistoryResponse.model_validate(payload)
    except ValidationError as exc:
        logger.exception("Invalid upstream metric payload for device '%s'", device_id)
        raise HTTPException(status_code=502, detail="Malformed upstream device payload") from exc

    if latest_history.device_id != device_id:
        logger.warning(
            "Unexpected device id in latest payload for '%s': %s",
            device_id,
            latest_history.device_id,
        )
        raise HTTPException(status_code=502, detail="Malformed upstream device payload")

    if not latest_history.items:
        raise HTTPException(status_code=404, detail=f"No latest data found for device '{device_id}'")

    row_device_ids = {item.device_id for item in latest_history.items}
    if row_device_ids != {device_id}:
        logger.warning(
            "Mixed or unexpected device ids in upstream payload for '%s': %s",
            device_id,
            sorted(row_device_ids),
        )
        raise HTTPException(status_code=502, detail="Malformed upstream device payload")

    latest_item = max(latest_history.items, key=lambda item: item.event_time)

    return DeviceLatestOverviewResponse(
        device_id=device_id,
        latest_event_time=latest_item.event_time,
        readings=latest_item.measurements,
    )


def get_device_history(
    device_id: str,
    *,
    aggregate: str,
    bucket_unit: str,
    bucket_size: int,
    limit: int,
) -> DeviceHistoryResponse:
    payload = fetch_device_history(
        device_id,
        aggregate=aggregate,
        bucket_unit=bucket_unit,
        bucket_size=bucket_size,
        limit=limit,
    )

    try:
        history = DeviceHistoryResponse.model_validate(payload)
    except ValidationError as exc:
        logger.exception("Invalid upstream history payload for device '%s'", device_id)
        raise HTTPException(status_code=502, detail="Malformed upstream device payload") from exc

    if history.device_id != device_id:
        logger.warning(
            "Unexpected device id in history payload for '%s': %s",
            device_id,
            history.device_id,
        )
        raise HTTPException(status_code=502, detail="Malformed upstream device payload")

    if not history.items:
        raise HTTPException(status_code=404, detail=f"No history found for device '{device_id}'")

    row_device_ids = {item.device_id for item in history.items}
    if row_device_ids != {device_id}:
        logger.warning(
            "Mixed or unexpected device ids in history payload for '%s': %s",
            device_id,
            sorted(row_device_ids),
        )
        raise HTTPException(status_code=502, detail="Malformed upstream device payload")

    return history

import logging

from fastapi import HTTPException
from pydantic import TypeAdapter, ValidationError

from app.schemas import (
    ComfortGridCell,
    DeviceHistoryResponse,
    DeviceHistoryBucketItem,
    DeviceLatestMetricRow,
    DeviceLatestOverviewResponse,
    OverviewReading,
)
from app.services.service_device_api import fetch_device_history
from app.services.service_device_api import fetch_device_latest
from app.services.service_thermal_comfort import calc_pmv_ppd
from app.utils.timezone import apply_measurement_tz_offset
from app.services.service_thermal_comfort import pmv_to_comfort_state

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
        latest_event_time=apply_measurement_tz_offset(latest_item.event_time),
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

    adjusted_items = [
        DeviceHistoryBucketItem(
            device_id=item.device_id,
            event_time=apply_measurement_tz_offset(item.event_time),
            measurements=item.measurements,
        )
        for item in history.items
    ]
    return DeviceHistoryResponse(
        device_id=history.device_id,
        count=history.count,
        items=adjusted_items,
    )


def get_comfort_grid(device_id: str) -> tuple[str, list[list[ComfortGridCell]]]:
    """
    Build 5×12 PMV comfort grid from last 30 days of hourly history.
    Rows = Monday–Friday, columns = 06:00–17:00.
    """
    history = get_device_history(
        device_id,
        aggregate="avg",
        bucket_unit="hour",
        bucket_size=1,
        limit=720,
    )
    # Group by (weekday 0–4, hour 0–11). Monday=1 in isoweekday, hour 6–17.
    DAYS, HOURS = 5, 12
    sums: dict[tuple[int, int], list[tuple[float, float]]] = {}
    for di in range(DAYS):
        for hi in range(HOURS):
            sums[(di, hi)] = []

    for item in history.items:
        dt = item.event_time
        wd = dt.isoweekday()  # 1=Mon .. 7=Sun
        h = dt.hour
        if wd < 1 or wd > 5 or h < 6 or h > 17:
            continue
        day_index = wd - 1
        hour_index = h - 6
        temp = item.measurements.get("temperature")
        rh = item.measurements.get("relative_humidity")
        t_val = getattr(temp, "value", None) if temp is not None else None
        rh_val = getattr(rh, "value", None) if rh is not None else None
        if t_val is not None:
            t_val = float(t_val)
        if rh_val is not None:
            rh_val = float(rh_val)
        if t_val is not None and rh_val is not None:
            sums[(day_index, hour_index)].append((t_val, rh_val))

    grid: list[list[ComfortGridCell]] = []
    for di in range(DAYS):
        row: list[ComfortGridCell] = []
        for hi in range(HOURS):
            points = sums[(di, hi)]
            if not points:
                row.append(ComfortGridCell(pmv=None, comfort_state="insufficient"))
                continue
            mean_t = sum(p[0] for p in points) / len(points)
            mean_rh = sum(p[1] for p in points) / len(points)
            try:
                pmv_val, _ppd, _comp = calc_pmv_ppd(mean_t, mean_rh)
                state = pmv_to_comfort_state(pmv_val)
                row.append(ComfortGridCell(pmv=round(pmv_val, 2), comfort_state=state))
            except Exception as e:
                logger.warning("PMV calculation failed for cell (%s, %s): %s", di, hi, e)
                row.append(ComfortGridCell(pmv=None, comfort_state="insufficient"))
        grid.append(row)
    return device_id, grid

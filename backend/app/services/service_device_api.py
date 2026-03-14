import logging

import httpx
from fastapi import HTTPException

from app.config import DEVICE_API_BASE_URL, DEVICE_API_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


def fetch_device_latest(device_id: str):
    base_url = DEVICE_API_BASE_URL.rstrip("/")
    url = f"{base_url}/devices/{device_id}/latest"

    try:
        response = httpx.get(url, timeout=DEVICE_API_TIMEOUT_SECONDS)
    except httpx.TimeoutException as exc:
        logger.warning("Timeout while fetching latest readings for device '%s'", device_id)
        raise HTTPException(status_code=504, detail="Upstream device API timed out") from exc
    except httpx.HTTPError as exc:
        logger.exception("Failed to reach upstream device API for device '%s'", device_id)
        raise HTTPException(status_code=502, detail="Upstream device API unavailable") from exc

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"No data found for device '{device_id}'")

    if response.status_code >= 400:
        logger.warning(
            "Unexpected upstream response for device '%s': %s",
            device_id,
            response.status_code,
        )
        raise HTTPException(status_code=502, detail="Upstream device API error")

    try:
        return response.json()
    except ValueError as exc:
        logger.exception("Invalid JSON from upstream device API for device '%s'", device_id)
        raise HTTPException(status_code=502, detail="Invalid upstream device payload") from exc


def fetch_device_history(
    device_id: str,
    *,
    aggregate: str,
    bucket_unit: str,
    bucket_size: int,
    limit: int,
):
    base_url = DEVICE_API_BASE_URL.rstrip("/")
    url = f"{base_url}/devices/{device_id}/history"
    params = {
        "aggregate": aggregate,
        "bucket_unit": bucket_unit,
        "bucket_size": bucket_size,
        "limit": limit,
    }

    try:
        response = httpx.get(
            url,
            params=params,
            timeout=DEVICE_API_TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException as exc:
        logger.warning("Timeout while fetching history for device '%s'", device_id)
        raise HTTPException(status_code=504, detail="Upstream device API timed out") from exc
    except httpx.HTTPError as exc:
        logger.exception("Failed to reach upstream device API for device '%s' history", device_id)
        raise HTTPException(status_code=502, detail="Upstream device API unavailable") from exc

    if response.status_code == 404:
        raise HTTPException(status_code=404, detail=f"No data found for device '{device_id}'")

    if response.status_code >= 400:
        logger.warning(
            "Unexpected upstream response for device '%s' history: %s",
            device_id,
            response.status_code,
        )
        raise HTTPException(status_code=502, detail="Upstream device API error")

    try:
        return response.json()
    except ValueError as exc:
        logger.exception("Invalid JSON from upstream device API for device '%s' history", device_id)
        raise HTTPException(status_code=502, detail="Invalid upstream device payload") from exc

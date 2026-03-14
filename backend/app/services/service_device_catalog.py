import json
from functools import lru_cache

from pydantic import TypeAdapter

from app.config import CATALOG_DIR
from app.schemas import SchoolDeviceCatalogEntry

_DEVICE_CATALOG_ADAPTER = TypeAdapter(list[SchoolDeviceCatalogEntry])


def _load_device_catalog_json():
    catalog_path = CATALOG_DIR / "device_assignments.json"

    try:
        with catalog_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Device catalog file not found: {catalog_path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in device catalog file {catalog_path}: {exc}") from exc


@lru_cache(maxsize=1)
def _load_device_catalog():
    return _DEVICE_CATALOG_ADAPTER.validate_python(_load_device_catalog_json())


def list_devices_for_school(school_id: str):
    for school_entry in _load_device_catalog():
        if school_entry.school_id == school_id:
            return [device.model_dump() for device in school_entry.devices]

    return []

import json
from functools import lru_cache
from pathlib import Path

from pydantic import TypeAdapter

from app.config import CATALOG_DIR, IDF_DIR
from app.schemas import RoomCatalogEntry, SchoolMetadata


_SCHOOL_CATALOG_ADAPTER = TypeAdapter(list[SchoolMetadata])
_ROOM_CATALOG_ADAPTER = TypeAdapter(list[RoomCatalogEntry])


def _load_json(path: Path):
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"Catalog file not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in catalog file {path}: {exc}") from exc


@lru_cache(maxsize=1)
def _load_school_catalog():
    return _SCHOOL_CATALOG_ADAPTER.validate_python(
        _load_json(CATALOG_DIR / "schools.json")
    )


def _ensure_known_school(school_id: str):
    if school_id not in {school.id for school in _load_school_catalog()}:
        raise ValueError(f"Unknown school_id '{school_id}'")


@lru_cache(maxsize=None)
def _load_room_catalog_for_school(school_id: str):
    _ensure_known_school(school_id)
    rooms_path = CATALOG_DIR / school_id / "rooms.json"
    return _ROOM_CATALOG_ADAPTER.validate_python(_load_json(rooms_path))


def _enrich_room(school_id: str, room: RoomCatalogEntry | dict):
    room_data = room.model_dump() if isinstance(room, RoomCatalogEntry) else dict(room)
    idf_path = IDF_DIR / school_id / room_data["idf_file"]
    return {
        **room_data,
        "school_id": school_id,
        "idf_path": str(idf_path),
        "idf_exists": idf_path.exists(),
    }


def list_schools():
    return [school.model_dump() for school in _load_school_catalog()]


def list_rooms(school_id: str):
    return [
        _enrich_room(school_id, room)
        for room in _load_room_catalog_for_school(school_id)
    ]


def get_room_by_id(school_id: str, room_id: str):
    try:
        rooms = _load_room_catalog_for_school(school_id)
    except ValueError:
        return None

    for room in rooms:
        if room.id == room_id:
            return _enrich_room(school_id, room)

    return None

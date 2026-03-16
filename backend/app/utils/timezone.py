"""Apply configured timezone offset to measurement timestamps (naive datetimes)."""

from datetime import datetime, timedelta


def apply_measurement_tz_offset(dt: datetime) -> datetime:
    """Add MEASUREMENT_TZ_OFFSET_HOURS to a naive datetime for display in user's local time."""
    from app.config import MEASUREMENT_TZ_OFFSET_HOURS

    return dt + timedelta(hours=MEASUREMENT_TZ_OFFSET_HOURS)

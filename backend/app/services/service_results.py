import sqlite3
from pathlib import Path


JOULES_TO_KWH = 1 / 3_600_000
JOULES_TO_GJ = 1e-9
DIESEL_GJ_PER_LITER = 0.0386


def _fetch_all(sql_path: str, query: str):
    conn = sqlite3.connect(sql_path)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.cursor()
        cur.execute(query)
        return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def extract_results(sql_path: str):
    sql_path = Path(sql_path)

    if not sql_path.exists():
        raise FileNotFoundError(f"SQL output not found: {sql_path}")

    # SQL query to retrieve average, minimum and maximum occupancy per zone.
    zone_occupancy_query = """
    SELECT d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_occupant_count,
        MIN(v.VariableValue) AS min_occupant_count,
        MAX(v.VariableValue) AS max_occupant_count
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone People Occupant Count'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    GROUP BY d.KeyValue
    ORDER BY d.KeyValue;
    """

    zone_temperature_query = """
    SELECT d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_mean_air_temperature_c,
        MIN(v.VariableValue) AS min_mean_air_temperature_c,
        MAX(v.VariableValue) AS max_mean_air_temperature_c
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Mean Air Temperature'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    GROUP BY d.KeyValue
    ORDER BY d.KeyValue;
    """

    thermal_comfort_query = """
    SELECT d.KeyValue AS zone_name,
        v.VariableValue AS not_comfortable_hours
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Thermal Comfort ASHRAE 55 Simple Model Summer or Winter Clothes Not Comfortable Time'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    ORDER BY d.KeyValue;
    """

    energy_query = """
    SELECT d.VariableName AS variable_name,
        SUM(v.VariableValue) AS total_joules
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName IN (
    'Cooling:Electricity',
    'Heating:Diesel',
    'Fans:Electricity',
    'Pumps:Electricity',
    'InteriorLights:Electricity',
    'InteriorEquipment:Electricity',
    'Electricity:Facility'
    )
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    GROUP BY d.VariableName
    ORDER BY d.VariableName;
    """

    period_query = """
    SELECT EnvironmentPeriodIndex,
        EnvironmentName,
        EnvironmentType
    FROM EnvironmentPeriods
    WHERE EnvironmentType = 3
    ORDER BY EnvironmentPeriodIndex
    LIMIT 1;
    """

    date_range_query = """
    SELECT
        MIN(printf('%04d-%02d-%02d', t.Year, t.Month, t.Day)) AS start_date,
        MAX(printf('%04d-%02d-%02d', t.Year, t.Month, t.Day)) AS end_date
    FROM Time t
    WHERE t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0;
    """

    daily_heating_diesel_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        SUM(v.VariableValue) AS heating_diesel_joules
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Heating:Diesel'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day
    ORDER BY t.Year, t.Month, t.Day;
    """

    daily_electricity_facility_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        SUM(v.VariableValue) AS electricity_facility_joules
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Electricity:Facility'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day
    ORDER BY t.Year, t.Month, t.Day;
    """

    daily_zone_temperature_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_mean_air_temperature_c
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Mean Air Temperature'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    daily_zone_co2_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_co2_ppm
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Air CO2 Concentration'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    daily_zone_occupancy_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_occupant_count
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone People Occupant Count'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    daily_zone_relative_humidity_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_relative_humidity_pct
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Air Relative Humidity'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    daily_zone_operative_temperature_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_operative_temperature_c
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Operative Temperature'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    daily_zone_heating_setpoint_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_heating_setpoint_c
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Thermostat Heating Setpoint Temperature'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    daily_zone_cooling_setpoint_query = """
    SELECT
        printf('%04d-%02d-%02d', t.Year, t.Month, t.Day) AS date,
        d.KeyValue AS zone_name,
        AVG(v.VariableValue) AS avg_cooling_setpoint_c
    FROM ReportVariableData v
    JOIN ReportVariableDataDictionary d
    ON v.ReportVariableDataDictionaryIndex = d.ReportVariableDataDictionaryIndex
    JOIN Time t
    ON v.TimeIndex = t.TimeIndex
    WHERE d.VariableName = 'Zone Thermostat Cooling Setpoint Temperature'
    AND t.EnvironmentPeriodIndex = 3
    AND t.WarmupFlag = 0
    AND t.Year > 0
    AND t.Month > 0
    AND t.Day > 0
    GROUP BY t.Year, t.Month, t.Day, d.KeyValue
    ORDER BY t.Year, t.Month, t.Day, d.KeyValue;
    """

    zone_occupancy = _fetch_all(str(sql_path), zone_occupancy_query)
    zone_temperatures = _fetch_all(str(sql_path), zone_temperature_query)
    thermal_comfort_rows = _fetch_all(str(sql_path), thermal_comfort_query)
    energy_rows = _fetch_all(str(sql_path), energy_query)

    period_rows = _fetch_all(str(sql_path), period_query)
    period_info = period_rows[0] if period_rows else None

    date_range_rows = _fetch_all(str(sql_path), date_range_query)
    date_range_info = date_range_rows[0] if date_range_rows else None

    daily_heating_rows = _fetch_all(str(sql_path), daily_heating_diesel_query)
    daily_electricity_rows = _fetch_all(str(sql_path), daily_electricity_facility_query)

    daily_zone_temperature_rows = _fetch_all(str(sql_path), daily_zone_temperature_query)
    daily_zone_co2_rows = _fetch_all(str(sql_path), daily_zone_co2_query)

    daily_zone_occupancy_rows = _fetch_all(str(sql_path), daily_zone_occupancy_query)

    daily_zone_relative_humidity_rows = _fetch_all(
        str(sql_path), daily_zone_relative_humidity_query
    )

    daily_zone_relative_humidity = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_relative_humidity_pct": row["avg_relative_humidity_pct"],
        }
        for row in daily_zone_relative_humidity_rows
    ]

    daily_zone_operative_temperature_rows = _fetch_all(
        str(sql_path), daily_zone_operative_temperature_query
    )

    daily_zone_heating_setpoint_rows = _fetch_all(
        str(sql_path), daily_zone_heating_setpoint_query
    )

    daily_zone_cooling_setpoint_rows = _fetch_all(
        str(sql_path), daily_zone_cooling_setpoint_query
    )

    daily_zone_heating_setpoint = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_heating_setpoint_c": row["avg_heating_setpoint_c"],
        }
        for row in daily_zone_heating_setpoint_rows
    ]

    daily_zone_cooling_setpoint = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_cooling_setpoint_c": row["avg_cooling_setpoint_c"],
        }
        for row in daily_zone_cooling_setpoint_rows
    ]

    daily_zone_operative_temperature = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_operative_temperature_c": row["avg_operative_temperature_c"],
        }
        for row in daily_zone_operative_temperature_rows
    ]

    daily_heating_diesel = [
        {
            "date": row["date"],
            "joules": row["heating_diesel_joules"],
            "kwh": row["heating_diesel_joules"] * JOULES_TO_KWH,
        }
        for row in daily_heating_rows
    ]

    daily_electricity_facility = [
        {
            "date": row["date"],
            "joules": row["electricity_facility_joules"],
            "kwh": row["electricity_facility_joules"] * JOULES_TO_KWH,
        }
        for row in daily_electricity_rows
    ]

    daily_zone_temperature = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_mean_air_temperature_c": row["avg_mean_air_temperature_c"],
        }
        for row in daily_zone_temperature_rows
    ]

    daily_zone_co2 = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_co2_ppm": row["avg_co2_ppm"],
        }
        for row in daily_zone_co2_rows
    ]

    daily_zone_occupancy = [
        {
            "date": row["date"],
            "zone_name": row["zone_name"],
            "avg_occupant_count": row["avg_occupant_count"],
        }
        for row in daily_zone_occupancy_rows
    ]

    energy_summary = {}
    for row in energy_rows:
        variable_name = row["variable_name"]
        total_joules = row["total_joules"] or 0.0

        key = (
            variable_name.lower()
            .replace(":", "_")
            .replace("/", "_")
            .replace(" ", "_")
        )

        energy_entry = {
            "joules": total_joules,
            "kwh": total_joules * JOULES_TO_KWH,
        }

        if key == "heating_diesel":
            energy_entry["liters"] = total_joules * JOULES_TO_GJ / DIESEL_GJ_PER_LITER

        energy_summary[key] = energy_entry

    thermal_comfort_summary = [
        {
            "zone_name": row["zone_name"],
            "not_comfortable_hours": row["not_comfortable_hours"],
        }
        for row in thermal_comfort_rows
    ]

    return {
        "period_info": {
            "environment_period_index": period_info["EnvironmentPeriodIndex"] if period_info else None,
            "environment_period_name": period_info["EnvironmentName"] if period_info else None,
            "environment_type": period_info["EnvironmentType"] if period_info else None,
            "warmup_excluded": True,
            "start_date": date_range_info["start_date"] if date_range_info else None,
            "end_date": date_range_info["end_date"] if date_range_info else None,
        },
        "zone_occupancy_summary": zone_occupancy,
        "zone_temperature_summary": zone_temperatures,
        "thermal_comfort_summary": thermal_comfort_summary,
        "energy_summary": energy_summary,
        "daily_timeseries": {
            "heating_diesel_daily": daily_heating_diesel,
            "electricity_facility_daily": daily_electricity_facility,
            "zone_mean_air_temperature_daily": daily_zone_temperature,
            "zone_co2_daily": daily_zone_co2,
            "zone_occupancy_daily": daily_zone_occupancy,
            "zone_relative_humidity_daily": daily_zone_relative_humidity,
            "zone_operative_temperature_daily": daily_zone_operative_temperature,
            "zone_heating_setpoint_daily": daily_zone_heating_setpoint,
            "zone_cooling_setpoint_daily": daily_zone_cooling_setpoint,
        },
    }

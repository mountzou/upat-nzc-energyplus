from eppy.modeleditor import IDF

from app.config import ENERGYPLUS_IDD

# Load the EnergyPlus IDF file
def load_idf(idf_path: str):
    IDF.setiddname(str(ENERGYPLUS_IDD))
    return IDF(idf_path)

# Inspect the IDF file
def inspect_idf(idf_path: str):
    idf = load_idf(idf_path)

    object_summary = {
        "VERSION": len(idf.idfobjects["VERSION"]),
        "BUILDING": len(idf.idfobjects["BUILDING"]),
        "ZONE": len(idf.idfobjects["ZONE"]),
        "PEOPLE": len(idf.idfobjects["PEOPLE"]),
        "LIGHTS": len(idf.idfobjects["LIGHTS"]),
        "ELECTRICEQUIPMENT": len(idf.idfobjects["ELECTRICEQUIPMENT"]),
        "THERMOSTATSETPOINT:DUALSETPOINT": len(idf.idfobjects["THERMOSTATSETPOINT:DUALSETPOINT"]),
        "SCHEDULE:COMPACT": len(idf.idfobjects["SCHEDULE:COMPACT"]),
    }

    return {
        "idf_loaded": True,
        "idf_path": idf_path,
        "idd_path": str(ENERGYPLUS_IDD),
        "object_summary": object_summary,
    }

# Inspect the thermostat object
def inspect_thermostat(idf_path: str):
    idf = load_idf(idf_path)

    thermostats = idf.idfobjects["THERMOSTATSETPOINT:DUALSETPOINT"]
    if not thermostats:
        return {"error": "No thermostat object found"}

    thermostat = thermostats[0]

    return {
        "name": thermostat.Name,
        "heating_schedule_name": thermostat.Heating_Setpoint_Temperature_Schedule_Name,
        "cooling_schedule_name": thermostat.Cooling_Setpoint_Temperature_Schedule_Name,
    }

# Inspect the schedule by name
def inspect_schedule_by_name(idf_path: str, schedule_name: str):
    idf = load_idf(idf_path)

    schedules = idf.idfobjects["SCHEDULE:COMPACT"]
    for schedule in schedules:
        if schedule.Name == schedule_name:
            return {
                "name": schedule.Name,
                "fields": schedule.fieldvalues,
            }

    return {"error": f"Schedule '{schedule_name}' not found"}

# Update the value of a schedule compact object
def update_schedule_compact_value(
    idf_path: str,
    schedule_name: str,
    target_for: str,
    target_until: str,
    new_value: float,
):
    idf = load_idf(idf_path)

    schedules = idf.idfobjects["SCHEDULE:COMPACT"]
    target_schedule = None

    for schedule in schedules:
        if schedule.Name == schedule_name:
            target_schedule = schedule
            break

    if target_schedule is None:
        raise ValueError(f"Schedule '{schedule_name}' not found")

    fields = list(target_schedule.fieldvalues)

    in_target_block = False
    old_value = None
    updated_index = None

    for i, value in enumerate(fields):
        if isinstance(value, str) and value.startswith("For:"):
            in_target_block = value == target_for
            continue

        if in_target_block and value == target_until:
            if i + 1 >= len(fields):
                raise ValueError(
                    f"No value found after '{target_until}' in schedule '{schedule_name}'"
                )
            old_value = fields[i + 1]
            updated_index = i + 1
            break

    if updated_index is None:
        raise ValueError(
            f"Could not update schedule '{schedule_name}' for block '{target_for}' and until '{target_until}'"
        )

    fieldname = target_schedule.objls[updated_index]
    setattr(target_schedule, fieldname, new_value)

    idf.saveas(idf_path)

    return {
        "schedule_name": schedule_name,
        "target_for": target_for,
        "target_until": target_until,
        "old_value": old_value,
        "new_value": new_value,
        "updated_field": fieldname,
    }

# Apply the setpoint schedule updates to the IDF file
def apply_setpoint_schedule_updates(
    idf_path: str,
    heating_setpoint: float,
    cooling_setpoint: float,
):
    return apply_room_setpoint_updates(
        idf_path=idf_path,
        heating_schedule_name="Htg-SetP-Sch",
        heating_setpoint=heating_setpoint,
        cooling_schedule_name="Clg-SetP-Sch",
        cooling_setpoint=cooling_setpoint,
    )


def apply_room_setpoint_updates(
    idf_path: str,
    heating_schedule_name: str,
    heating_setpoint: float,
    cooling_schedule_name: str | None = None,
    cooling_setpoint: float | None = None,
):
    heating_edit = update_schedule_compact_value(
        idf_path=idf_path,
        schedule_name=heating_schedule_name,
        target_for="For: WeekDays",
        target_until="Until: 14:00",
        new_value=heating_setpoint,
    )

    cooling_edit = None
    if cooling_schedule_name is not None and cooling_setpoint is not None:
        cooling_edit = update_schedule_compact_value(
            idf_path=idf_path,
            schedule_name=cooling_schedule_name,
            target_for="For: WeekDays",
            target_until="Until: 14:00",
            new_value=cooling_setpoint,
        )

    return {
        "heating_schedule_edit": heating_edit,
        "cooling_schedule_edit": cooling_edit,
    }

# Inspect the people objects
def inspect_people_objects(idf_path: str):
    idf = load_idf(idf_path)

    people_objects = idf.idfobjects["PEOPLE"]
    results = []

    for obj in people_objects:
        results.append(
            {
                "name": obj.Name,
                "zone_or_zonelist_or_space_or_spacelist_name": obj.Zone_or_ZoneList_or_Space_or_SpaceList_Name,
                "number_of_people_schedule_name": obj.Number_of_People_Schedule_Name,
                "number_of_people_calculation_method": obj.Number_of_People_Calculation_Method,
                "number_of_people": obj.Number_of_People,
                "people_per_floor_area": obj.People_per_Floor_Area,
                "floor_area_per_person": obj.Floor_Area_per_Person,
                "fraction_radiant": obj.Fraction_Radiant,
                "sensible_heat_fraction": obj.Sensible_Heat_Fraction,
                "activity_level_schedule_name": obj.Activity_Level_Schedule_Name,
            }
        )

    return {
        "count": len(results),
        "people_objects": results,
    }

# Apply the zone occupancy updates to the IDF file
def apply_zone_occupancy_updates(idf_path: str, zone_occupancy: dict):
    idf = load_idf(idf_path)

    people_objects = idf.idfobjects["PEOPLE"]
    updates = []

    for obj in people_objects:
        zone_name = obj.Zone_or_ZoneList_or_Space_or_SpaceList_Name

        if zone_name in zone_occupancy:
            old_value = obj.Number_of_People
            new_value = zone_occupancy[zone_name]

            obj.Number_of_People = new_value

            updates.append(
                {
                    "people_object": obj.Name,
                    "zone_name": zone_name,
                    "old_value": old_value,
                    "new_value": new_value,
                }
            )

    idf.saveas(idf_path)

    return {
        "updated_count": len(updates),
        "updates": updates,
    }


def apply_people_object_occupancy_update(
    idf_path: str,
    people_object_name: str,
    occupancy: int,
):
    idf = load_idf(idf_path)

    people_objects = idf.idfobjects["PEOPLE"]

    for obj in people_objects:
        if obj.Name != people_object_name:
            continue

        old_value = obj.Number_of_People
        obj.Number_of_People = occupancy
        idf.saveas(idf_path)

        return {
            "people_object": obj.Name,
            "zone_name": obj.Zone_or_ZoneList_or_Space_or_SpaceList_Name,
            "old_value": old_value,
            "new_value": occupancy,
        }

    raise ValueError(f"People object '{people_object_name}' not found")

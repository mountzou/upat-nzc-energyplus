import re

from eppy.modeleditor import IDF

from app.config import ENERGYPLUS_IDD

OCCUPIED_SETPOINT_UNTIL_VALUES = [
    "Until: 14:00",
    "Until: 13:00",
    "Until: 12:00",
]


def _normalize_schedule_token(value: str):
    return " ".join(value.strip().casefold().split())


def _split_idf_objects(contents: str):
    objects = []
    current = []

    for line in contents.splitlines(keepends=True):
        current.append(line)
        if ";" in line:
            objects.append(current)
            current = []

    if current:
        objects.append(current)

    return objects


def _update_schedule_compact_value_text(
    idf_path: str,
    schedule_name: str,
    target_for: str,
    target_until: str | list[str] | tuple[str, ...],
    new_value: float,
):
    with open(idf_path, "r", encoding="utf-8") as handle:
        contents = handle.read()

    target_until_values = (
        [target_until] if isinstance(target_until, str) else list(target_until)
    )
    normalized_target_for = _normalize_schedule_token(target_for)
    normalized_target_until_values = {
        _normalize_schedule_token(value) for value in target_until_values
    }

    objects = _split_idf_objects(contents)
    updated = False
    edit_result = None
    fallback_match = None

    for object_lines in objects:
        if not object_lines:
            continue

        joined = "".join(object_lines)
        if not re.match(r"^\s*Schedule:Compact\s*,", joined, flags=re.IGNORECASE):
            continue

        object_type_index = None
        for idx, line in enumerate(object_lines):
            if re.match(r"^\s*Schedule:Compact\s*,", line, flags=re.IGNORECASE):
                object_type_index = idx
                break

        if object_type_index is None:
            continue

        name_line_index = None
        for idx, line in enumerate(
            object_lines[object_type_index + 1 :], start=object_type_index + 1
        ):
            stripped = line.strip()
            if not stripped or stripped.startswith("!"):
                continue
            name_line_index = idx
            break

        if name_line_index is None:
            continue

        schedule_object_name = object_lines[name_line_index].split("!", 1)[0]
        schedule_object_name = schedule_object_name.strip().rstrip(",;")
        if schedule_object_name != schedule_name:
            continue

        in_target_block = False
        for idx, line in enumerate(object_lines):
            line_body = line.split("!", 1)[0].strip()
            if not line_body:
                continue

            normalized_line = _normalize_schedule_token(line_body.rstrip(",;"))
            if normalized_line.startswith("for:"):
                in_target_block = normalized_target_for in normalized_line
                continue

            if not in_target_block or not normalized_line.startswith("until:"):
                if not normalized_line.startswith("until:"):
                    continue
            if normalized_line.split(",", 1)[0] not in normalized_target_until_values:
                continue

            match = re.match(
                r"^(\s*Until:\s*[^,]+,\s*)([^,;]+)([;,]?.*)$",
                line.rstrip("\n"),
                flags=re.IGNORECASE,
            )
            if match is None:
                raise ValueError(
                    f"Could not parse schedule line '{line.strip()}' in schedule '{schedule_name}'"
                )

            if not in_target_block and fallback_match is None:
                fallback_match = (object_lines, idx, match, target_until_values)
                continue

            old_value = match.group(2).strip()
            line_ending = "\n" if line.endswith("\n") else ""
            object_lines[idx] = (
                f"{match.group(1)}{new_value}{match.group(3)}{line_ending}"
            )
            updated = True
            edit_result = {
                "schedule_name": schedule_name,
                "target_for": target_for,
                "target_until": target_until_values,
                "old_value": old_value,
                "new_value": new_value,
                "updated_field": "text_fallback",
            }
            break

        if updated:
            break

    if not updated and fallback_match is not None:
        object_lines, idx, match, target_until_values = fallback_match
        old_value = match.group(2).strip()
        original_line = object_lines[idx]
        line_ending = "\n" if original_line.endswith("\n") else ""
        object_lines[idx] = (
            f"{match.group(1)}{new_value}{match.group(3)}{line_ending}"
        )
        updated = True
        edit_result = {
            "schedule_name": schedule_name,
            "target_for": target_for,
            "target_until": target_until_values,
            "old_value": old_value,
            "new_value": new_value,
            "updated_field": "text_fallback_any_matching_until",
        }

    if not updated:
        raise ValueError(
            f"Could not update schedule '{schedule_name}' for block '{target_for}' and until one of {target_until_values}"
        )

    with open(idf_path, "w", encoding="utf-8") as handle:
        handle.write("".join("".join(lines) for lines in objects))

    return edit_result


def _update_people_object_occupancy_text(
    idf_path: str,
    people_object_name: str,
    occupancy: int,
):
    with open(idf_path, "r", encoding="utf-8") as handle:
        contents = handle.read()

    objects = _split_idf_objects(contents)
    updated = False
    edit_result = None

    for object_lines in objects:
        if not object_lines:
            continue

        joined = "".join(object_lines)
        if not re.match(r"^\s*People\s*,", joined, flags=re.IGNORECASE):
            continue

        object_type_index = None
        for idx, line in enumerate(object_lines):
            if re.match(r"^\s*People\s*,", line, flags=re.IGNORECASE):
                object_type_index = idx
                break

        if object_type_index is None:
            continue

        name_line_index = None
        for idx, line in enumerate(
            object_lines[object_type_index + 1 :], start=object_type_index + 1
        ):
            stripped = line.strip()
            if not stripped or stripped.startswith("!"):
                continue
            name_line_index = idx
            break

        if name_line_index is None:
            continue

        object_name = object_lines[name_line_index].split("!", 1)[0]
        object_name = object_name.strip().rstrip(",;")
        if object_name != people_object_name:
            continue

        zone_name = None
        for idx in range(name_line_index + 1, len(object_lines)):
            stripped = object_lines[idx].strip()
            if not stripped or stripped.startswith("!"):
                continue
            zone_name = object_lines[idx].split("!", 1)[0].strip().rstrip(",;")
            break

        for idx, line in enumerate(object_lines):
            if (
                "!- Number of People" not in line
                or "Schedule Name" in line
                or "Calculation Method" in line
            ):
                continue
            match = re.match(r"^(\s*)([^,;]+)([;,]?.*)$", line)
            if match is None:
                match = re.match(r"^(\s*)([^,;]+)([;,]?.*)$", line.rstrip("\n"))
            if match is None:
                raise ValueError(
                    f"Could not parse People line '{line.strip()}' in object '{people_object_name}'"
                )

            old_value = match.group(2).strip()
            line_ending = "\n" if line.endswith("\n") else ""
            object_lines[idx] = (
                f"{match.group(1)}{occupancy}{match.group(3)}{line_ending}"
            )
            updated = True
            edit_result = {
                "people_object": people_object_name,
                "zone_name": zone_name,
                "old_value": old_value,
                "new_value": occupancy,
            }
            break

        if updated:
            break

    if not updated:
        raise ValueError(f"People object '{people_object_name}' not found")

    with open(idf_path, "w", encoding="utf-8") as handle:
        handle.write("".join("".join(lines) for lines in objects))

    return edit_result

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
    target_until: str | list[str] | tuple[str, ...],
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
    normalized_target_for = _normalize_schedule_token(target_for)
    target_until_values = (
        [target_until] if isinstance(target_until, str) else list(target_until)
    )
    normalized_target_until_values = {
        _normalize_schedule_token(value) for value in target_until_values
    }

    for i, value in enumerate(fields):
        if isinstance(value, str) and value.startswith("For:"):
            in_target_block = normalized_target_for in _normalize_schedule_token(value)
            continue

        if (
            in_target_block
            and isinstance(value, str)
            and _normalize_schedule_token(value) in normalized_target_until_values
        ):
            if i + 1 >= len(fields):
                raise ValueError(
                    f"No value found after '{value}' in schedule '{schedule_name}'"
                )
            old_value = fields[i + 1]
            updated_index = i + 1
            break

    if updated_index is None:
        raise ValueError(
            f"Could not update schedule '{schedule_name}' for block '{target_for}' and until one of {target_until_values}"
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
    try:
        heating_edit = update_schedule_compact_value(
            idf_path=idf_path,
            schedule_name=heating_schedule_name,
            target_for="For: WeekDays",
            target_until=OCCUPIED_SETPOINT_UNTIL_VALUES,
            new_value=heating_setpoint,
        )
    except Exception:
        heating_edit = _update_schedule_compact_value_text(
            idf_path=idf_path,
            schedule_name=heating_schedule_name,
            target_for="For: WeekDays",
            target_until=OCCUPIED_SETPOINT_UNTIL_VALUES,
            new_value=heating_setpoint,
        )

    cooling_edit = None
    if cooling_schedule_name is not None and cooling_setpoint is not None:
        try:
            cooling_edit = update_schedule_compact_value(
                idf_path=idf_path,
                schedule_name=cooling_schedule_name,
                target_for="For: WeekDays",
                target_until=OCCUPIED_SETPOINT_UNTIL_VALUES,
                new_value=cooling_setpoint,
            )
        except Exception:
            cooling_edit = _update_schedule_compact_value_text(
                idf_path=idf_path,
                schedule_name=cooling_schedule_name,
                target_for="For: WeekDays",
                target_until=OCCUPIED_SETPOINT_UNTIL_VALUES,
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
    try:
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
    except Exception:
        return _update_people_object_occupancy_text(
            idf_path=idf_path,
            people_object_name=people_object_name,
            occupancy=occupancy,
        )

    raise ValueError(f"People object '{people_object_name}' not found")

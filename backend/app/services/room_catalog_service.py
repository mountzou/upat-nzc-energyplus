from app.config import SCHOOL_22_IDF_DIR


ROOM_CATALOG = [
    {
        "id": "classroom",
        "label": "Classroom",
        "idf_file": "classroom.idf",
        "zone_name": "Classroom",
        "people_object_name": "Room People",
        "occupancy_schedule_name": "OCCUPY-ROOM",
        "thermostat_type": "single_heating",
        "heating_schedule_name": "Htg-SetP-Sch",
        "cooling_schedule_name": None,
        "supports": {
            "occupancy": True,
            "heating_setpoint": True,
            "cooling_setpoint": False,
        },
        "defaults": {
            "occupancy": 20,
            "heating_setpoint": 17,
            "cooling_setpoint": None,
        },
        "static_schedules": {
            "occupancy": "OCCUPY-ROOM",
            "lighting": "LIGHTS-1",
            "heating_availability": "Heat-Avail",
            "thermostat_control": "Zone Control Type Sched",
            "ventilation": "Vent-Sch",
            "activity": "ActSchd",
            "heating_setpoint": "Htg-SetP-Sch",
            "outdoor_co2": "Outdoor_CO2_Level",
        },
    },
    {
        "id": "eventhall",
        "label": "Event Hall",
        "idf_file": "eventhall.idf",
        "zone_name": "Event_Hall",
        "people_object_name": "Room People",
        "occupancy_schedule_name": "OCCUPY-ROOM",
        "thermostat_type": "single_heating",
        "heating_schedule_name": "Htg-SetP-Sch",
        "cooling_schedule_name": None,
        "supports": {
            "occupancy": True,
            "heating_setpoint": True,
            "cooling_setpoint": False,
        },
        "defaults": {
            "occupancy": 250,
            "heating_setpoint": 24,
            "cooling_setpoint": None,
        },
        "static_schedules": {
            "occupancy": "OCCUPY-ROOM",
            "lighting": "LIGHTS-1",
            "equipment": "EQUIP-Event",
            "heating_availability": "Heat-Avail",
            "thermostat_control": "Zone Control Type Sched",
            "ventilation": "Vent-Sch",
            "activity": "ActSchd",
            "heating_setpoint": "Htg-SetP-Sch",
            "outdoor_co2": "Outdoor_CO2_Level",
        },
    },
    {
        "id": "library",
        "label": "Library",
        "idf_file": "library.idf",
        "zone_name": "library",
        "people_object_name": "Room People",
        "occupancy_schedule_name": "OCCUPY-ROOM",
        "thermostat_type": "single_heating",
        "heating_schedule_name": "Htg-SetP-Sch",
        "cooling_schedule_name": None,
        "supports": {
            "occupancy": True,
            "heating_setpoint": True,
            "cooling_setpoint": False,
        },
        "defaults": {
            "occupancy": 20,
            "heating_setpoint": 17,
            "cooling_setpoint": None,
        },
        "static_schedules": {
            "occupancy": "OCCUPY-ROOM",
            "lighting": "LIGHTS-1",
            "heating_availability": "Heat-Avail",
            "thermostat_control": "Zone Control Type Sched",
            "ventilation": "Vent-Sch",
            "activity": "ActSchd",
            "heating_setpoint": "Htg-SetP-Sch",
            "outdoor_co2": "Outdoor_CO2_Level",
        },
    },
    {
        "id": "pcroom",
        "label": "PC Room",
        "idf_file": "pcroom.idf",
        "zone_name": "PC Room",
        "people_object_name": "Room People",
        "occupancy_schedule_name": "OCCUPY-ROOM",
        "thermostat_type": "single_heating",
        "heating_schedule_name": "Htg-SetP-Sch",
        "cooling_schedule_name": None,
        "supports": {
            "occupancy": True,
            "heating_setpoint": True,
            "cooling_setpoint": False,
        },
        "defaults": {
            "occupancy": 20,
            "heating_setpoint": 17,
            "cooling_setpoint": None,
        },
        "static_schedules": {
            "occupancy": "OCCUPY-ROOM",
            "lighting": "LIGHTS-1",
            "equipment": "EQUIP-1",
            "heating_availability": "Heat-Avail",
            "thermostat_control": "Zone Control Type Sched",
            "ventilation": "Vent-Sch",
            "activity": "ActSchd",
            "heating_setpoint": "Htg-SetP-Sch",
            "outdoor_co2": "Outdoor_CO2_Level",
        },
    },
    {
        "id": "principal",
        "label": "Principal Office",
        "idf_file": "principal.idf",
        "zone_name": "Principal_Office",
        "people_object_name": "Room2 People",
        "occupancy_schedule_name": "OCCUPY-ROOM2",
        "thermostat_type": "single_heating",
        "heating_schedule_name": "Htg-SetP-Sch",
        "cooling_schedule_name": None,
        "supports": {
            "occupancy": True,
            "heating_setpoint": True,
            "cooling_setpoint": False,
        },
        "defaults": {
            "occupancy": 1,
            "heating_setpoint": 17,
            "cooling_setpoint": None,
        },
        "static_schedules": {
            "occupancy": "OCCUPY-ROOM2",
            "lighting": "LIGHTS-2",
            "equipment": "EQUIP-1",
            "heating_availability": "Heat-Avail",
            "thermostat_control": "Zone Control Type Sched1",
            "secondary_thermostat_control": "Zone Control Type Sched2",
            "ventilation": "Vent-Sch2",
            "activity": "ActSchd",
            "heating_setpoint": "Htg-SetP-Sch",
            "outdoor_co2": "Outdoor_CO2_Level",
        },
    },
    {
        "id": "teachers",
        "label": "Teachers Office",
        "idf_file": "teachers.idf",
        "zone_name": "Teachers_Office",
        "people_object_name": "Room1 People",
        "occupancy_schedule_name": "OCCUPY-ROOM1",
        "thermostat_type": "dual_setpoint",
        "heating_schedule_name": "Htg-SetP-Sch",
        "cooling_schedule_name": "Clg-SetP-Sch",
        "supports": {
            "occupancy": True,
            "heating_setpoint": True,
            "cooling_setpoint": True,
        },
        "defaults": {
            "occupancy": 20,
            "heating_setpoint": 17,
            "cooling_setpoint": 22,
        },
        "static_schedules": {
            "occupancy": "OCCUPY-ROOM1",
            "lighting": "LIGHTS-1",
            "hvac_availability": "HVAC-Avail",
            "thermostat_control": "Zone Control Type Sched2",
            "ventilation": "Vent-Sch1",
            "activity": "ActSchd",
            "heating_setpoint": "Htg-SetP-Sch",
            "cooling_setpoint": "Clg-SetP-Sch",
            "outdoor_co2": "Outdoor_CO2_Level",
        },
    },
]


def list_rooms():
    rooms = []

    for room in ROOM_CATALOG:
        idf_path = SCHOOL_22_IDF_DIR / room["idf_file"]
        room_info = {
            **room,
            "idf_path": str(idf_path),
            "idf_exists": idf_path.exists(),
        }
        rooms.append(room_info)

    return rooms


def get_room_by_id(room_id: str):
    for room in ROOM_CATALOG:
        if room["id"] == room_id:
            idf_path = SCHOOL_22_IDF_DIR / room["idf_file"]
            return {
                **room,
                "idf_path": str(idf_path),
                "idf_exists": idf_path.exists(),
            }

    return None

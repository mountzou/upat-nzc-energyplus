import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

const buildInitialRoomConfigs = (rooms) =>
  Object.fromEntries(
    rooms.map((room) => [
      room.id,
      {
        enabled: false,
        occupancy: room.defaults.occupancy,
        heating_setpoint: room.defaults.heating_setpoint,
        cooling_setpoint: room.defaults.cooling_setpoint,
      },
    ])
  );

export default function useSchoolRooms({ isAuthenticated, authSchoolId }) {
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(authSchoolId);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [schoolsError, setSchoolsError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomConfigs, setRoomConfigs] = useState({});
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setSchools([]);
      setSelectedSchoolId("");
      setSchoolsLoading(false);
      return;
    }

    const loadSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/schools`);
        if (!res.ok) {
          throw new Error(`Failed to load schools (${res.status})`);
        }

        const data = await res.json();
        setSchools(data);
        setSelectedSchoolId(authSchoolId || data[0]?.id || "");
      } catch (error) {
        setSchoolsError(error.message);
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, [authSchoolId, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRooms([]);
      setRoomConfigs({});
      setRoomsLoading(false);
      return;
    }

    if (!selectedSchoolId) {
      setRooms([]);
      setRoomConfigs({});
      setRoomsLoading(false);
      return;
    }

    const loadRooms = async () => {
      setRoomsLoading(true);
      setRoomsError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/rooms?school_id=${selectedSchoolId}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load rooms (${res.status})`);
        }

        const data = await res.json();
        setRooms(data);
        setRoomConfigs(buildInitialRoomConfigs(data));
      } catch (error) {
        setRoomsError(error.message);
      } finally {
        setRoomsLoading(false);
      }
    };

    loadRooms();
  }, [isAuthenticated, selectedSchoolId]);

  const toggleRoom = (roomId) => {
    setRoomConfigs((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        enabled: !prev[roomId]?.enabled,
      },
    }));
  };

  const updateRoomValue = (roomId, field, value) => {
    setRoomConfigs((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value,
      },
    }));
  };

  const resetSchoolRooms = () => {
    setSelectedSchoolId("");
    setSchools([]);
    setRooms([]);
    setRoomConfigs({});
    setSchoolsError(null);
    setRoomsError(null);
  };

  return {
    schools,
    selectedSchoolId,
    schoolsLoading,
    schoolsError,
    rooms,
    roomConfigs,
    roomsLoading,
    roomsError,
    setSelectedSchoolId,
    toggleRoom,
    updateRoomValue,
    resetSchoolRooms,
  };
}

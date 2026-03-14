import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

export default function useSchoolDevices(schoolId) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDevices = async () => {
      if (!schoolId) {
        setDevices([]);
        setLoading(false);
        setError("School is required.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE_URL}/overview/schools/${encodeURIComponent(schoolId)}/devices`
        );
        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.detail || `Failed to load devices (${res.status})`);
        }

        setDevices(payload);
      } catch (loadError) {
        setDevices([]);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadDevices();
  }, [schoolId]);

  return {
    devices,
    loading,
    error,
  };
}

import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

export default function useOverviewLatest(deviceId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOverview = async (nextDeviceId = deviceId) => {
    const trimmedDeviceId = (nextDeviceId || "").trim();
    if (!trimmedDeviceId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/overview/devices/${encodeURIComponent(trimmedDeviceId)}/latest`
      );
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.detail || `Failed to load overview (${res.status})`);
      }

      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview(deviceId);
  }, [deviceId]);

  return {
    data,
    loading,
    error,
    reloadOverview: loadOverview,
  };
}

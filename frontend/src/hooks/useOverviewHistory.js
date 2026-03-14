import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";

export default function useOverviewHistory(
  deviceId,
  {
    aggregate = "avg",
    bucketUnit = "hour",
    bucketSize = 1,
    limit = 24,
  } = {}
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHistory = async (
    nextDeviceId = deviceId,
    nextOptions = {
      aggregate,
      bucketUnit,
      bucketSize,
      limit,
    }
  ) => {
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
      const searchParams = new URLSearchParams({
        aggregate: nextOptions.aggregate,
        bucket_unit: nextOptions.bucketUnit,
        bucket_size: String(nextOptions.bucketSize),
        limit: String(nextOptions.limit),
      });

      const res = await fetch(
        `${API_BASE_URL}/overview/devices/${encodeURIComponent(trimmedDeviceId)}/history?${searchParams.toString()}`
      );
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload.detail || `Failed to load device history (${res.status})`);
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
    loadHistory(deviceId, {
      aggregate,
      bucketUnit,
      bucketSize,
      limit,
    });
  }, [deviceId, aggregate, bucketUnit, bucketSize, limit]);

  return {
    data,
    loading,
    error,
    reloadHistory: loadHistory,
  };
}

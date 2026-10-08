"use client";

import { useCallback, useState } from "react";

/** Lists microphones/cameras on demand (labels are only available after permission is granted). */
export function useMediaDevices() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const refresh = useCallback(async () => {
    try {
      setDevices(await navigator.mediaDevices.enumerateDevices());
    } catch {
      setDevices([]);
    }
  }, []);
  return { devices, refresh };
}

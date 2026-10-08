import { useEffect, useState } from "react";

/** Current time, re-rendering every `intervalMs` (used for clocks and relative labels). */
export function useNow(intervalMs = 30_000): Date | null {
  // Starts as null so server and client render the same markup (no hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

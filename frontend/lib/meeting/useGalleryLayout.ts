"use client";

import { useEffect, useState, type RefObject } from "react";

const ASPECT = 16 / 9;
const GAP = 8;

/**
 * Picks the column count that makes 16:9 tiles as large as possible inside the container —
 * the same idea as Zoom's gallery view.
 */
export function useGalleryLayout(containerRef: RefObject<HTMLElement | null>, count: number) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  let best = { columns: 1, tileWidth: 0 };
  for (let columns = 1; columns <= Math.max(1, count); columns++) {
    const rows = Math.ceil(count / columns);
    const widthLimit = (size.width - GAP * (columns - 1)) / columns;
    const heightLimit = ((size.height - GAP * (rows - 1)) / rows) * ASPECT;
    const tileWidth = Math.floor(Math.min(widthLimit, heightLimit));
    if (tileWidth > best.tileWidth) best = { columns, tileWidth };
  }
  return { ...best, gap: GAP };
}

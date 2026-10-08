import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const PALETTE = ["#0b5cff", "#7c3aed", "#0f9d8a", "#e8590c", "#c2255c", "#2f9e44", "#1971c2", "#9c36b5"];

/** Stable colour per name so the same person always gets the same avatar colour. */
function colorFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold text-white", className ?? "size-8 text-xs")}
      style={{ backgroundColor: colorFor(name) }}
    >
      {initials(name)}
    </span>
  );
}

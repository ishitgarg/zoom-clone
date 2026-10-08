"use client";

import { useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

/** Small dark menu that opens above a toolbar button. */
export function ToolbarPopover({
  open,
  onClose,
  children,
  align = "center",
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose, open);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(
        "absolute bottom-[calc(100%+10px)] z-40 animate-pop-in rounded-xl border border-room-line bg-[#2a2a2a] p-1.5 text-sm text-room-text shadow-pop",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "left" && "left-0",
        align === "right" && "right-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const popoverItem =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left whitespace-nowrap hover:bg-room-hover disabled:opacity-40";

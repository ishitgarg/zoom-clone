import type { LucideIcon } from "lucide-react";

import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

/** The big rounded-square buttons on the home screen (New meeting / Join / Schedule / Share screen). */
export function ActionTile({
  icon: Icon,
  label,
  onClick,
  tone = "blue",
  loading = false,
  loadingLabel,
  hideLabel = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  tone?: "orange" | "blue";
  loading?: boolean;
  loadingLabel?: string;
  /** The label is rendered by the parent (e.g. with a dropdown chevron). */
  hideLabel?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className="group flex flex-col items-center gap-2.5 rounded-2xl text-center focus-visible:outline-offset-4 disabled:cursor-wait"
    >
      <span
        className={cn(
          "grid size-[60px] place-items-center rounded-[18px] text-white transition-[filter,transform] group-hover:brightness-110 group-active:scale-95 sm:size-[68px] sm:rounded-[20px]",
          tone === "orange" ? "bg-orange" : "bg-brand",
        )}
      >
        {loading ? <Spinner className="size-6 border-[3px]" /> : <Icon className="size-7 sm:size-8" strokeWidth={2} />}
      </span>
      {!hideLabel && (
        <span className="text-[12px] whitespace-nowrap text-ink sm:text-[15px]">{loading && loadingLabel ? loadingLabel : label}</span>
      )}
    </button>
  );
}

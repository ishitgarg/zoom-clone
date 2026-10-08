import { AlertCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** Used for empty and error states inside cards and pages. */
export function StatusMessage({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-8 text-center", className)} role={tone === "error" ? "alert" : undefined}>
      <span
        className={cn(
          "mb-3 grid size-11 place-items-center rounded-full",
          tone === "error" ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand",
        )}
      >
        <Icon className="size-5" />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

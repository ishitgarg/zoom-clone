import { ChevronUp, type LucideIcon } from "lucide-react";
import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ToolbarButtonProps {
  icon: LucideIcon;
  /** Short label under the icon, e.g. "Audio". */
  label: string;
  /** What the button does, for screen readers and tooltips, e.g. "Mute". Defaults to `label`. */
  actionLabel?: string;
  onClick: () => void;
  active?: boolean;
  /** Red slash style used for "muted"/"video off" states. */
  danger?: boolean;
  /** Replaces the default icon size/colour classes. */
  iconClassName?: string;
  badge?: ReactNode;
  disabled?: boolean;
  onMenuClick?: () => void;
  menuLabel?: string;
  className?: string;
  children?: ReactNode;
}

/** Icon-over-label button used in the in-meeting toolbar (Zoom style). */
export const ToolbarButton = forwardRef<HTMLDivElement, ToolbarButtonProps>(function ToolbarButton(
  { icon: Icon, label, actionLabel, onClick, active, danger, iconClassName, badge, disabled, onMenuClick, menuLabel, className, children },
  ref,
) {
  return (
    <div ref={ref} className={cn("relative flex items-stretch", className)}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={actionLabel ?? label}
        title={actionLabel ?? label}
        aria-pressed={active}
        className="flex min-w-[56px] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-room-text transition-colors hover:bg-room-hover disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[68px]"
      >
        <span className="relative">
          <Icon className={cn(iconClassName ?? "size-[22px]", danger && "text-[#ff5a5a]", active && "text-[#5c9dff]")} />
          {badge}
        </span>
        <span className="hidden text-[11px] leading-none whitespace-nowrap sm:block">{label}</span>
      </button>
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={menuLabel}
          className="-ml-1 hidden items-start rounded-md px-0.5 pt-1.5 text-room-muted hover:bg-room-hover hover:text-white sm:flex"
        >
          <ChevronUp className="size-3.5" />
        </button>
      )}
      {children}
    </div>
  );
});

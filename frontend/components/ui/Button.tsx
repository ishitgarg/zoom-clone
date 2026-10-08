import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-soft";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover active:bg-brand-active disabled:bg-brand/40",
  secondary:
    "bg-white text-ink border border-line-strong hover:bg-hover active:bg-line disabled:text-subtle disabled:hover:bg-white",
  ghost: "text-ink-2 hover:bg-hover active:bg-line disabled:text-subtle",
  danger: "bg-danger text-white hover:bg-danger-hover disabled:bg-danger/40",
  "danger-soft": "text-danger hover:bg-danger/10 disabled:text-danger/40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Text shown next to the spinner while loading, e.g. "Joining meeting..." */
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, loadingText, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="size-3.5" />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
});

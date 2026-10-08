import { AlertCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { cn } from "@/lib/cn";

/** Simple centered page used for loading, errors and "you left the meeting". */
export function MeetingStatusScreen({
  icon: Icon = AlertCircle,
  title,
  description,
  actions,
  tone = "neutral",
  spinning = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: "neutral" | "error";
  spinning?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-[60px] items-center border-b border-line bg-white px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white px-8 py-10 text-center shadow-card" role={tone === "error" ? "alert" : "status"}>
          <span
            className={cn(
              "mx-auto mb-4 grid size-14 place-items-center rounded-full",
              tone === "error" ? "bg-danger/10 text-danger" : "bg-brand-soft text-brand",
            )}
          >
            <Icon className={cn("size-7", spinning && "animate-spin")} />
          </span>
          <h1 className="text-xl font-bold">{title}</h1>
          {description && <p className="mt-2 text-sm text-muted">{description}</p>}
          {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
        </div>
      </main>
    </div>
  );
}

export const HomeLink = () => (
  <Link href="/" className="inline-flex h-9 items-center rounded-lg border border-line-strong bg-white px-4 text-sm font-semibold hover:bg-hover">
    Back to Home
  </Link>
);

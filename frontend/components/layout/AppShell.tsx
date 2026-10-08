"use client";

import { Home, Settings, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { SettingsDialog } from "@/components/layout/SettingsDialog";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { cn } from "@/lib/cn";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/meetings", label: "Meetings", icon: Video },
];

const navItemClass = (active: boolean) =>
  cn(
    "flex flex-col items-center justify-center gap-1 rounded-xl text-[12px] transition-colors",
    active ? "bg-white text-ink shadow-card" : "text-ink-2 hover:bg-white/60",
  );

/**
 * Zoom Workplace-style frame: grey top bar and left navigation rail around a white content
 * panel. On phones the rail becomes a bottom tab bar.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, status } = useCurrentUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col bg-shell md:h-dvh">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-4 md:px-5">
        <Logo />
        <div className="flex items-center gap-2">
          {status === "ready" && !user?.is_authenticated && (
            <>
              <Link href="/signin" className="hidden rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink-2 hover:bg-white/60 sm:block">
                Sign In
              </Link>
              <Link href="/signup" className="rounded-lg bg-brand px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-hover">
                Sign Up Free
              </Link>
            </>
          )}
          <ProfileMenu onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left navigation rail (tablet/desktop) */}
        <nav aria-label="Main" className="hidden w-[100px] shrink-0 flex-col items-center px-2 pb-3 md:flex">
          <div className="flex w-full flex-col gap-1.5">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn(navItemClass(isActive(href)), "h-[68px]")}>
                <Icon className="size-[22px]" strokeWidth={1.8} />
                {label}
              </Link>
            ))}
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} className={cn(navItemClass(false), "mt-auto h-[68px] w-full")}>
            <Settings className="size-[22px]" strokeWidth={1.8} />
            Settings
          </button>
        </nav>

        {/* White content panel */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-white pb-20 md:mr-2 md:mb-2 md:rounded-2xl md:pb-0">{children}</div>
      </div>

      {/* Bottom tab bar (phones) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-line bg-shell px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] md:hidden">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined} className={cn(navItemClass(isActive(href)), "h-14")}>
            <Icon className="size-5" strokeWidth={1.8} />
            {label}
          </Link>
        ))}
        <button type="button" onClick={() => setSettingsOpen(true)} className={cn(navItemClass(false), "h-14")}>
          <Settings className="size-5" strokeWidth={1.8} />
          Settings
        </button>
      </nav>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

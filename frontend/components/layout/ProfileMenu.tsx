"use client";

import { CalendarClock, LogIn, LogOut, Settings, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

const ITEM = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-hover";

export function ProfileMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { user, signOut } = useCurrentUser();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const name = user?.name ?? "Guest";
  const signedIn = Boolean(user?.is_authenticated);

  const handleSignOut = async () => {
    close();
    await signOut();
    toast("You have signed out", "success");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile"
        className="relative rounded-full p-0.5 transition-shadow hover:ring-4 hover:ring-hover"
      >
        <Avatar name={name} className="size-8 text-xs" />
        <span className="absolute right-0 bottom-0 size-2.5 rounded-full border-2 border-white bg-success" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-72 animate-pop-in rounded-xl border border-line bg-white p-2 shadow-pop">
          <div className="flex items-center gap-3 px-3 py-3">
            <Avatar name={name} className="size-11 text-sm" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-[12px] text-muted">{user?.email ?? "Loading..."}</p>
              <span className="mt-1 inline-block rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand uppercase">
                {signedIn ? "Basic" : "Demo account"}
              </span>
            </div>
          </div>
          {!signedIn && (
            <p className="mx-3 mb-2 rounded-lg bg-canvas px-3 py-2 text-[12px] text-muted">
              You&apos;re using the default demo account. Sign in or sign up to use your own.
            </p>
          )}
          <div className="border-t border-line pt-1">
            <button role="menuitem" type="button" className={ITEM} onClick={() => {
                close();
                onOpenSettings();
              }}>
              <Settings className="size-4 text-muted" /> Settings
            </button>
            <Link role="menuitem" href="/meetings" onClick={close} className={ITEM}>
              <CalendarClock className="size-4 text-muted" /> My meetings
            </Link>
          </div>
          <div className="mt-1 border-t border-line pt-1">
            {signedIn ? (
              <button role="menuitem" type="button" className={ITEM} onClick={handleSignOut}>
                <LogOut className="size-4 text-muted" /> Sign Out
              </button>
            ) : (
              <>
                <Link role="menuitem" href="/signin" onClick={close} className={ITEM}>
                  <LogIn className="size-4 text-muted" /> Sign In
                </Link>
                <Link role="menuitem" href="/signup" onClick={close} className={ITEM}>
                  <UserPlus className="size-4 text-muted" /> Sign Up Free
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

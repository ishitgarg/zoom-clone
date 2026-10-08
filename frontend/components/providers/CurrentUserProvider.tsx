"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { authApi } from "@/lib/api/auth";
import { meetingsApi } from "@/lib/api/meetings";
import { AUTH_CHANGED_EVENT, setAuthToken } from "@/lib/auth/token-store";
import type { CurrentUser } from "@/types/api";

type Status = "loading" | "ready" | "error";

interface CurrentUserState {
  user: CurrentUser | null;
  status: Status;
  error: boolean;
  /** Store a new sign-in token and load that user. */
  signIn: (token: string) => Promise<void>;
  /** End the sign-in; the app falls back to the default demo user. */
  signOut: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserState>({
  user: null,
  status: "loading",
  error: false,
  signIn: async () => undefined,
  signOut: async () => undefined,
});

async function fetchCurrentUser(): Promise<{ user: CurrentUser | null; status: Status }> {
  try {
    return { user: await meetingsApi.getCurrentUser(), status: "ready" };
  } catch {
    return { user: null, status: "error" };
  }
}

/** Loads the current user (signed-in account, or the default demo user) for the whole app. */
export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const load = useCallback(async () => {
    const result = await fetchCurrentUser();
    setUser(result.user);
    setStatus(result.status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentUser().then((result) => {
      if (cancelled) return;
      setUser(result.user);
      setStatus(result.status);
    });
    // Another tab (or an expired token) changed the sign-in state.
    const onChange = () => void load();
    window.addEventListener(AUTH_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [load]);

  const signIn = useCallback(
    async (token: string) => {
      setStatus("loading");
      setAuthToken(token);
      await load();
    },
    [load],
  );

  const signOut = useCallback(async () => {
    setStatus("loading");
    try {
      await authApi.signOut();
    } catch {
      // Even if the server can't be reached, forget the token locally.
    }
    setAuthToken(null);
    await load();
  }, [load]);

  return (
    <CurrentUserContext.Provider value={{ user, status, error: status === "error", signIn, signOut }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export const useCurrentUser = () => useContext(CurrentUserContext);

import { useCallback, useEffect, useState } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { errorMessage } from "@/lib/api/client";
import { meetingsApi } from "@/lib/api/meetings";
import type { Meeting } from "@/types/api";

interface ListState {
  data: Meeting[];
  loading: boolean;
  error: string | null;
}

interface Loaded {
  /** Which user these lists belong to (so we never show another account's meetings). */
  userKey: string;
  upcoming: ListState;
  recent: ListState;
}

const LOADING: ListState = { data: [], loading: true, error: null };

async function fetchList(fetcher: () => Promise<Meeting[]>): Promise<ListState> {
  try {
    return { data: await fetcher(), loading: false, error: null };
  } catch (error) {
    return { data: [], loading: false, error: errorMessage(error) };
  }
}

async function fetchLists(userKey: string): Promise<Loaded> {
  const [upcoming, recent] = await Promise.all([fetchList(meetingsApi.listUpcoming), fetchList(meetingsApi.listRecent)]);
  return { userKey, upcoming, recent };
}

/**
 * Upcoming + recent meetings for the current user, with a `reload` for after mutations.
 * Lists load once the current user is known, and again whenever they sign in or out.
 */
export function useMeetingLists() {
  const { user, status } = useCurrentUser();
  const userKey = status === "loading" ? null : String(user?.id ?? "unknown");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [retrying, setRetrying] = useState(false);

  /** Re-fetch after a change (e.g. a meeting was scheduled or deleted). */
  const reload = useCallback(async () => {
    if (userKey === null) return;
    setLoaded(await fetchLists(userKey));
    setRetrying(false);
  }, [userKey]);

  const retry = useCallback(() => {
    setRetrying(true);
    void reload();
  }, [reload]);

  // Initial load, and again whenever the signed-in user changes.
  useEffect(() => {
    if (userKey === null) return;
    let cancelled = false;
    fetchLists(userKey).then((lists) => {
      if (!cancelled) setLoaded(lists);
    });
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  const current = loaded && loaded.userKey === userKey && !retrying ? loaded : null;
  return { upcoming: current?.upcoming ?? LOADING, recent: current?.recent ?? LOADING, reload, retry };
}

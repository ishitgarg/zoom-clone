"use client";

import { Loader2, SearchX } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MeetingExperience, type ResumedSession } from "@/components/meeting-room/MeetingExperience";
import { HomeLink, MeetingStatusScreen } from "@/components/meeting-room/MeetingStatusScreen";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { ApiError, errorMessage } from "@/lib/api/client";
import { meetingsApi } from "@/lib/api/meetings";
import { participantsApi } from "@/lib/api/participants";
import { parseMeetingInput } from "@/lib/format";
import { clearSession, loadSession } from "@/lib/meeting/session-store";
import type { Meeting } from "@/types/api";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string; notFound: boolean }
  | { kind: "ready"; meeting: Meeting; resumed: ResumedSession | null };

/**
 * /meeting/[meetingId] — the invite link target. Validates the meeting with the backend,
 * resumes this tab's session after a refresh, then hands over to MeetingExperience.
 */
export function MeetingPage() {
  const params = useParams<{ meetingId: string }>();
  const searchParams = useSearchParams();
  const { user, error: userError } = useCurrentUser();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [visit, setVisit] = useState(0); // bumping this remounts the experience for "Rejoin"
  const [retry, setRetry] = useState(0);

  const meetingId = parseMeetingInput(decodeURIComponent(params.meetingId ?? ""));
  // Captured once: the URL's ?start=1 is removed after joining, but "Rejoin" should still rejoin as host.
  const [wantsToStart] = useState(() => searchParams.get("start") === "1");
  // From the dashboard's "Share screen" tile: offer to share as soon as we're in.
  const [wantsToShare] = useState(() => searchParams.get("share") === "1");

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<LoadState> => {
      if (!meetingId) {
        return { kind: "error", message: "This link doesn't contain a valid meeting ID.", notFound: true };
      }
      try {
        const meeting = await meetingsApi.get(meetingId);
        let resumed: ResumedSession | null = null;
        const stored = loadSession(meetingId);
        if (stored) {
          try {
            const beat = await participantsApi.heartbeat(meetingId, stored.token);
            if (beat.participant.is_active) resumed = { session: stored, self: beat.participant };
            else clearSession(meetingId);
          } catch {
            clearSession(meetingId);
          }
        }
        return { kind: "ready", meeting, resumed };
      } catch (error) {
        return {
          kind: "error",
          message: errorMessage(error),
          notFound: error instanceof ApiError && (error.isNotFound || error.status === 422),
        };
      }
    };
    void load().then((next) => !cancelled && setState(next));
    return () => {
      cancelled = true;
    };
  }, [meetingId, retry]);

  const rejoin = useCallback(() => {
    setVisit((v) => v + 1);
    setState((s) => (s.kind === "ready" ? { ...s, resumed: null } : s));
  }, []);

  if (state.kind === "loading") {
    return <MeetingStatusScreen icon={Loader2} spinning title="Loading meeting..." description="Checking the meeting details." />;
  }

  if (state.kind === "error") {
    return (
      <MeetingStatusScreen
        tone="error"
        icon={state.notFound ? SearchX : undefined}
        title={state.notFound ? "Meeting not found" : "Couldn't load meeting"}
        description={state.message}
        actions={
          <>
            {!state.notFound && (
              <Button
                onClick={() => {
                  setState({ kind: "loading" });
                  setRetry((r) => r + 1);
                }}
              >
                Try again
              </Button>
            )}
            {state.notFound && (
              <Link href="/join" className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-hover">
                Join another meeting
              </Link>
            )}
            <HomeLink />
          </>
        }
      />
    );
  }

  if (state.meeting.status === "cancelled") {
    return (
      <MeetingStatusScreen tone="error" title="Meeting cancelled" description="The host cancelled this meeting." actions={<HomeLink />} />
    );
  }

  // Only the meeting's owner may start it as host; wait for the user to load before deciding.
  const isOwner = user ? user.id === state.meeting.host.id : false;
  if (wantsToStart && !state.resumed && !user && !userError) {
    return <MeetingStatusScreen icon={Loader2} spinning title="Loading meeting..." />;
  }

  return (
    <MeetingExperience
      key={visit}
      meeting={state.meeting}
      resumed={state.resumed}
      autoStartAsHost={wantsToStart && isOwner}
      offerScreenShare={wantsToShare && visit === 0}
      onRejoin={rejoin}
    />
  );
}

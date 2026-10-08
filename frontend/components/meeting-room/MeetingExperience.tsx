"use client";

import { DoorOpen, UserX, VideoOff, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Logo } from "@/components/layout/Logo";
import { MeetingRoom } from "@/components/meeting-room/MeetingRoom";
import { HomeLink, MeetingStatusScreen } from "@/components/meeting-room/MeetingStatusScreen";
import { PreJoinScreen } from "@/components/meeting-room/PreJoinScreen";
import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { errorMessage } from "@/lib/api/client";
import { participantsApi } from "@/lib/api/participants";
import { clearSession, saveSession, type StoredSession } from "@/lib/meeting/session-store";
import { useLocalMedia } from "@/lib/meeting/useLocalMedia";
import type { ExitReason } from "@/lib/meeting/useMeetingPresence";
import { loadPreferences, savePreferences } from "@/lib/preferences";
import type { Meeting, Participant } from "@/types/api";

export interface ResumedSession {
  session: StoredSession;
  self: Participant;
}

type Phase =
  | { kind: "prejoin" }
  | { kind: "joining" }
  | { kind: "in-meeting"; session: StoredSession; self: Participant }
  | { kind: "exited"; reason: ExitReason };

interface Props {
  meeting: Meeting;
  /** Present when this tab was already in the meeting (page refresh). */
  resumed: ResumedSession | null;
  /** Host clicked New meeting / Start: join straight away without the preview screen. */
  autoStartAsHost: boolean;
  /** Joined through the "Share screen" tile. */
  offerScreenShare: boolean;
  onRejoin: () => void;
}

/**
 * Owns the camera/microphone for one visit to a meeting and moves between
 * preview → joining → in the meeting → left.
 */
export function MeetingExperience({ meeting, resumed, autoStartAsHost, offerScreenShare, onRejoin }: Props) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [prefs] = useState(loadPreferences);
  const media = useLocalMedia(
    resumed
      ? { audio: !resumed.self.is_muted, video: resumed.self.is_video_on }
      : { audio: !prefs.joinWithMicMuted, video: !prefs.joinWithVideoOff },
  );

  const [phase, setPhase] = useState<Phase>(
    resumed ? { kind: "in-meeting", ...resumed } : autoStartAsHost ? { kind: "joining" } : { kind: "prejoin" },
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  const meetingId = meeting.meeting_id;

  const join = useCallback(
    async (displayName: string, asHost: boolean) => {
      setPhase({ kind: "joining" });
      setJoinError(null);
      try {
        const result = await participantsApi.join(meetingId, {
          display_name: displayName,
          as_host: asHost,
          is_muted: !media.audioEnabled,
          is_video_on: media.videoEnabled,
        });
        const session = { participantId: result.participant.id, token: result.session_token };
        saveSession(meetingId, session);
        setPhase({ kind: "in-meeting", session, self: result.participant });
        // Drop ?start=1 so a refresh resumes the session instead of starting again.
        router.replace(`/meeting/${meetingId}`);
      } catch (error) {
        setJoinError(errorMessage(error));
        setPhase({ kind: "prejoin" });
      }
    },
    [meetingId, media.audioEnabled, media.videoEnabled, router],
  );

  // New meeting / Start: once the camera is ready, join as host automatically.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoStartAsHost || autoStarted.current || !media.ready || !user) return;
    autoStarted.current = true;
    void join(prefs.displayName || user.name, true);
  }, [autoStartAsHost, media.ready, user, prefs.displayName, join]);

  const handleExit = useCallback(
    (reason: ExitReason) => {
      clearSession(meetingId);
      media.stopAll();
      setPhase({ kind: "exited", reason });
    },
    [meetingId, media],
  );

  switch (phase.kind) {
    case "in-meeting":
      return (
        <MeetingRoom
          meeting={meeting}
          session={phase.session}
          initialSelf={phase.self}
          media={media}
          offerScreenShare={offerScreenShare}
          onExit={handleExit}
        />
      );

    case "joining":
      if (autoStartAsHost) {
        return (
          <div className="fixed inset-0 grid place-items-center bg-room text-room-text">
            <p className="flex items-center gap-3 text-sm" role="status">
              <Spinner className="size-5" /> {media.ready ? "Joining meeting..." : "Starting your camera..."}
            </p>
          </div>
        );
      }
    // falls through: keep the preview visible with a loading button while joining
    case "prejoin":
      return (
        <div className="min-h-dvh bg-white">
          <header className="flex h-[60px] items-center border-b border-line px-4 sm:px-6">
            <Logo />
          </header>
          <PreJoinScreen
            meeting={meeting}
            media={media}
            // Invite links are usually opened by guests, so only a remembered name is pre-filled.
            defaultName={prefs.displayName}
            error={joinError}
            joining={phase.kind === "joining"}
            onJoin={(name, remember) => {
              if (remember) savePreferences({ displayName: name });
              void join(name, false);
            }}
          />
        </div>
      );

    case "exited":
      return <ExitScreen reason={phase.reason} onRejoin={onRejoin} />;
  }
}

const EXIT_COPY: Record<ExitReason, { icon: typeof DoorOpen; title: string; description: string; canRejoin: boolean }> = {
  left: { icon: DoorOpen, title: "You left the meeting", description: "Thanks for joining.", canRejoin: true },
  ended: { icon: VideoOff, title: "This meeting has ended", description: "The host ended the meeting for everyone.", canRejoin: false },
  removed: { icon: UserX, title: "You have been removed", description: "The host removed you from this meeting.", canRejoin: false },
  session_lost: {
    icon: WifiOff,
    title: "You were disconnected",
    description: "We lost contact with the meeting. You can try joining again.",
    canRejoin: true,
  },
};

function ExitScreen({ reason, onRejoin }: { reason: ExitReason; onRejoin: () => void }) {
  const copy = EXIT_COPY[reason];
  return (
    <MeetingStatusScreen
      icon={copy.icon}
      title={copy.title}
      description={copy.description}
      actions={
        <>
          {copy.canRejoin && <Button onClick={onRejoin}>Rejoin</Button>}
          <HomeLink />
        </>
      }
    />
  );
}

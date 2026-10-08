"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, errorMessage } from "@/lib/api/client";
import { meetingsApi } from "@/lib/api/meetings";
import { participantsApi } from "@/lib/api/participants";
import { HEARTBEAT_INTERVAL_MS } from "@/lib/config";
import type { MeetingStatus, Participant, ParticipantStateUpdate } from "@/types/api";

/** Why this participant is no longer in the meeting. */
export type ExitReason = "left" | "removed" | "ended" | "session_lost";

interface Options {
  meetingId: string;
  token: string;
  initialSelf: Participant;
  onExit: (reason: ExitReason) => void;
  /** Called when the server says we were muted by the host while unmuted locally. */
  onMutedByHost: () => void;
  onNotice: (message: string) => void;
}

/**
 * Keeps this participant's presence alive (heartbeat every 2s) and exposes the live roster plus
 * actions that change participant state on the server.
 */
export function useMeetingPresence({ meetingId, token, initialSelf, onExit, onMutedByHost, onNotice }: Options) {
  const [self, setSelf] = useState<Participant>(initialSelf);
  const [participants, setParticipants] = useState<Participant[]>([initialSelf]);
  const [meetingStatus, setMeetingStatus] = useState<MeetingStatus>("live");
  const [connectionLost, setConnectionLost] = useState(false);

  // Bumped on every local state change, so a heartbeat that was in flight while we changed
  // our own state doesn't overwrite it with stale data.
  const localVersion = useRef(0);
  const exited = useRef(false);
  const selfRef = useRef(initialSelf);
  useEffect(() => {
    selfRef.current = self;
  }, [self]);
  const knownIds = useRef<Set<number> | null>(null);
  const callbacks = useRef({ onExit, onMutedByHost, onNotice });
  useEffect(() => {
    callbacks.current = { onExit, onMutedByHost, onNotice };
  });

  const exit = useCallback((reason: ExitReason) => {
    if (exited.current) return;
    exited.current = true;
    callbacks.current.onExit(reason);
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;

    const beat = async () => {
      const versionAtStart = localVersion.current;
      try {
        const result = await participantsApi.heartbeat(meetingId, token);
        if (stopped) return;
        setConnectionLost(false);

        const me = result.participant;
        if (!me.is_active) {
          if (me.left_reason === "removed") exit("removed");
          else if (me.left_reason === "meeting_ended") exit("ended");
          else exit("session_lost");
          return;
        }

        // Announce people joining/leaving (skip the very first roster).
        const ids = new Set(result.participants.map((p) => p.id));
        if (knownIds.current) {
          for (const p of result.participants) {
            if (!knownIds.current.has(p.id) && p.id !== me.id) callbacks.current.onNotice(`${p.display_name} joined`);
          }
        }
        knownIds.current = ids;

        setParticipants(result.participants);
        setMeetingStatus(result.meeting_status);
        if (versionAtStart === localVersion.current) {
          if (me.is_muted && !selfRef.current.is_muted) callbacks.current.onMutedByHost();
          setSelf(me);
        }
      } catch (error) {
        if (stopped) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
          exit("session_lost");
          return;
        }
        setConnectionLost(true);
      }
      if (!stopped) timer = window.setTimeout(beat, HEARTBEAT_INTERVAL_MS);
    };

    void beat();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [meetingId, token, exit]);

  /** Optimistically update my own state, then persist it. */
  const updateSelf = useCallback(
    async (update: ParticipantStateUpdate) => {
      localVersion.current += 1;
      // Reactions aren't applied optimistically: the server's timestamp is what triggers the animation.
      const optimistic = { ...update };
      delete optimistic.reaction;
      const replaceMe = (patch: Partial<Participant>) => {
        setSelf((p) => ({ ...p, ...patch }));
        setParticipants((list) => list.map((p) => (p.id === initialSelf.id ? { ...p, ...patch } : p)));
      };
      replaceMe(optimistic);
      try {
        const saved = await participantsApi.updateMe(meetingId, token, update);
        localVersion.current += 1;
        replaceMe(saved);
      } catch (error) {
        callbacks.current.onNotice(errorMessage(error));
      }
    },
    [meetingId, token, initialSelf.id],
  );

  const leave = useCallback(async () => {
    try {
      await participantsApi.leave(meetingId, token);
    } finally {
      exit("left");
    }
  }, [meetingId, token, exit]);

  const endForAll = useCallback(async () => {
    try {
      await meetingsApi.endForAll(meetingId, token);
      exit("ended");
    } catch (error) {
      callbacks.current.onNotice(errorMessage(error));
    }
  }, [meetingId, token, exit]);

  const hostAction = useCallback(
    async (action: () => Promise<unknown>, success: string) => {
      try {
        await action();
        callbacks.current.onNotice(success);
      } catch (error) {
        callbacks.current.onNotice(errorMessage(error));
      }
    },
    [],
  );

  const muteAll = useCallback(
    () => hostAction(() => participantsApi.muteAll(meetingId, token), "All participants have been muted"),
    [hostAction, meetingId, token],
  );
  const muteParticipant = useCallback(
    (p: Participant) => hostAction(() => participantsApi.mute(meetingId, token, p.id), `${p.display_name} has been muted`),
    [hostAction, meetingId, token],
  );
  const removeParticipant = useCallback(
    (p: Participant) =>
      hostAction(() => participantsApi.remove(meetingId, token, p.id), `${p.display_name} was removed from the meeting`),
    [hostAction, meetingId, token],
  );

  return {
    self,
    participants,
    meetingStatus,
    connectionLost,
    isHost: self.role === "host",
    updateSelf,
    leave,
    endForAll,
    muteAll,
    muteParticipant,
    removeParticipant,
  };
}

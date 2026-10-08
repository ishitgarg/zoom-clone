"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { errorMessage } from "@/lib/api/client";
import { chatApi } from "@/lib/api/participants";
import { CHAT_POLL_INTERVAL_MS } from "@/lib/config";
import type { ChatMessage } from "@/types/api";

/** Polls the meeting chat and tracks unread messages while the chat panel is closed. */
export function useChat(meetingId: string, token: string, selfId: number, panelOpen: boolean) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const lastId = useRef(0);
  const panelOpenRef = useRef(panelOpen);

  useEffect(() => {
    panelOpenRef.current = panelOpen;
    // Opening the panel marks everything as read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (panelOpen) setUnread(0);
  }, [panelOpen]);

  const append = useCallback(
    (incoming: ChatMessage[]) => {
      const fresh = incoming.filter((m) => m.id > lastId.current);
      if (fresh.length === 0) return;
      lastId.current = fresh[fresh.length - 1].id;
      setMessages((current) => [...current, ...fresh]);
      if (!panelOpenRef.current) setUnread((n) => n + fresh.filter((m) => m.participant_id !== selfId).length);
    },
    [selfId],
  );

  useEffect(() => {
    let timer: number | undefined;
    let stopped = false;
    const poll = async () => {
      try {
        append(await chatApi.list(meetingId, token, lastId.current));
      } catch {
        // Transient failures are retried on the next poll; presence shows connection problems.
      }
      if (!stopped) timer = window.setTimeout(poll, CHAT_POLL_INTERVAL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [meetingId, token, append]);

  const send = useCallback(
    async (body: string): Promise<string | null> => {
      try {
        append([await chatApi.send(meetingId, token, body)]);
        return null;
      } catch (error) {
        return errorMessage(error);
      }
    },
    [meetingId, token, append],
  );

  return { messages, unread, send };
}

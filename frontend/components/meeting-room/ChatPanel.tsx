"use client";

import { MessageSquare, SendHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { SidePanel } from "@/components/meeting-room/SidePanel";
import { formatTime } from "@/lib/format";
import type { ChatMessage } from "@/types/api";

const MAX_LENGTH = 1000;

interface Props {
  messages: ChatMessage[];
  selfId: number;
  onSend: (body: string) => Promise<string | null>;
  onClose: () => void;
}

export function ChatPanel({ messages, selfId, onSend, onClose }: Props) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const problem = await onSend(body);
    setSending(false);
    setError(problem);
    if (!problem) setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <SidePanel
      title="Meeting Chat"
      onClose={onClose}
      footer={
        <form onSubmit={submit}>
          <p className="mb-1.5 text-[12px] text-muted">
            To: <span className="rounded bg-brand-soft px-1.5 py-0.5 font-semibold text-brand">Everyone</span>
          </p>
          {error && <p role="alert" className="mb-1.5 text-[12px] text-danger">{error}</p>}
          <div className="flex items-end gap-2 rounded-lg border border-line-strong p-2 focus-within:border-brand">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={MAX_LENGTH}
              rows={2}
              placeholder="Type message here..."
              aria-label="Chat message"
              className="max-h-28 min-h-[40px] flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-subtle"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Send message"
              className="grid size-8 place-items-center rounded-lg text-brand hover:bg-brand-soft disabled:text-subtle disabled:hover:bg-transparent"
            >
              <SendHorizontal className="size-[18px]" />
            </button>
          </div>
        </form>
      }
    >
      {messages.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <MessageSquare className="mb-3 size-8 text-subtle" />
          <p className="text-sm text-muted">Messages you send here can be seen by everyone in the meeting.</p>
        </div>
      ) : (
        <ul className="space-y-4 px-4 py-4" aria-live="polite">
          {messages.map((message, index) => {
            const mine = message.participant_id === selfId;
            const previous = messages[index - 1];
            const grouped = previous && previous.participant_id === message.participant_id;
            return (
              <li key={message.id} className={grouped ? "-mt-3" : undefined} data-testid="chat-message">
                {!grouped && (
                  <p className="mb-1 text-[12px] text-muted">
                    <span className="font-semibold text-ink-2">{mine ? "Me" : message.sender_name}</span> to Everyone
                    <span className="ml-2">{formatTime(new Date(message.created_at))}</span>
                  </p>
                )}
                <p className={`inline-block max-w-full rounded-lg px-3 py-2 text-sm break-words whitespace-pre-wrap ${mine ? "bg-brand-soft" : "bg-canvas"}`}>
                  {message.body}
                </p>
              </li>
            );
          })}
          <div ref={endRef} />
        </ul>
      )}
    </SidePanel>
  );
}

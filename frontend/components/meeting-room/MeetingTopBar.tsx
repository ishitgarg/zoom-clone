"use client";

import { Check, Copy, LayoutGrid, ShieldCheck } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import type { ViewMode } from "@/components/meeting-room/VideoStage";
import { useToast } from "@/components/ui/Toast";
import { copyToClipboard } from "@/lib/clipboard";
import { formatMeetingId } from "@/lib/format";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { useNow } from "@/lib/hooks/useNow";
import type { Meeting, Participant } from "@/types/api";

function elapsed(since: string | null, now: Date | null): string {
  if (!since || !now) return "";
  const total = Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface Props {
  meeting: Meeting;
  self: Participant;
  hostName: string;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  connectionLost: boolean;
}

export function MeetingTopBar({ meeting, self, hostName, view, onViewChange, connectionLost }: Props) {
  const toast = useToast();
  const now = useNow(1000);
  const [infoOpen, setInfoOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setInfoOpen(false), []);
  useClickOutside(ref, close, infoOpen);
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const closeView = useCallback(() => setViewOpen(false), []);
  useClickOutside(viewRef, closeView, viewOpen);

  const copyLink = async () => {
    const ok = await copyToClipboard(meeting.invite_url);
    toast(ok ? "Invite link copied" : "Couldn't copy to clipboard", ok ? "success" : "error");
  };

  return (
    <div className="relative z-20 flex h-11 shrink-0 items-center justify-between px-3 text-room-text">
      <span className="min-w-0 truncate text-[14px] text-white">{meeting.title}</span>

      <div className="flex items-center gap-2">
        {connectionLost && (
          <span role="status" className="rounded-md bg-[#ffb800]/15 px-2 py-1 text-[12px] font-medium text-[#ffcc4d]">
            Reconnecting...
          </span>
        )}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="Meeting information"
            aria-expanded={infoOpen}
            className="grid size-7 place-items-center rounded-md text-[#3ddc84] hover:bg-room-hover"
          >
            <ShieldCheck className="size-[18px]" />
          </button>
          {infoOpen && (
            <div className="absolute top-9 right-0 w-[min(340px,calc(100vw-24px))] animate-pop-in rounded-xl border border-room-line bg-[#2a2a2a] p-4 text-[13px] shadow-pop">
              <p className="mb-3 text-[15px] font-semibold text-white">{meeting.title}</p>
              <dl className="grid grid-cols-[100px_1fr] gap-x-2 gap-y-2">
                <dt className="text-room-muted">Meeting ID</dt>
                <dd>{formatMeetingId(meeting.meeting_id)}</dd>
                <dt className="text-room-muted">Host</dt>
                <dd>{hostName}</dd>
                <dt className="text-room-muted">Invite link</dt>
                <dd className="min-w-0">
                  <span className="block truncate">{meeting.invite_url}</span>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="mt-1 inline-flex items-center gap-1 font-semibold text-[#5c9dff] hover:underline"
                  >
                    <Copy className="size-3.5" /> Copy link
                  </button>
                </dd>
                <dt className="text-room-muted">Duration</dt>
                <dd className="tabular-nums" suppressHydrationWarning>
                  {elapsed(meeting.started_at, now)}
                </dd>
                <dt className="text-room-muted">Participant ID</dt>
                <dd>{self.id}</dd>
              </dl>
            </div>
          )}
        </div>
        <div ref={viewRef} className="relative">
          <button
            type="button"
            onClick={() => setViewOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={viewOpen}
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium whitespace-nowrap hover:bg-room-hover"
          >
            <LayoutGrid className="size-4" />
            View
          </button>
          {viewOpen && (
            <div
              role="menu"
              className="absolute top-9 right-0 w-44 animate-pop-in rounded-xl border border-room-line bg-[#2a2a2a] p-1.5 text-[13px] shadow-pop"
            >
              {(["speaker", "gallery"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitemradio"
                  aria-checked={view === option}
                  onClick={() => {
                    onViewChange(option);
                    setViewOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-room-hover"
                >
                  <Check className={view === option ? "size-4" : "size-4 opacity-0"} />
                  {option === "speaker" ? "Speaker" : "Gallery"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Hand, Mic, MicOff, Search, Video, VideoOff } from "lucide-react";
import { useState } from "react";

import { SidePanel } from "@/components/meeting-room/SidePanel";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Participant } from "@/types/api";

interface Props {
  participants: Participant[];
  selfId: number;
  isHost: boolean;
  onClose: () => void;
  onInvite: () => void;
  onMuteAll: () => void;
  onMute: (p: Participant) => void;
  onRemove: (p: Participant) => void;
}

export function ParticipantsPanel({ participants, selfId, isHost, onClose, onInvite, onMuteAll, onMute, onRemove }: Props) {
  const [query, setQuery] = useState("");
  const [toRemove, setToRemove] = useState<Participant | null>(null);

  // Me first, then host, then everyone else in join order.
  const ordered = [...participants].sort(
    (a, b) => Number(b.id === selfId) - Number(a.id === selfId) || Number(b.role === "host") - Number(a.role === "host"),
  );
  const visible = ordered.filter((p) => p.display_name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <SidePanel
      title={`Participants (${participants.length})`}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onInvite}>
            Invite
          </Button>
          {isHost && (
            <Button variant="secondary" size="sm" className="flex-1" onClick={onMuteAll} disabled={participants.length < 2}>
              Mute All
            </Button>
          )}
        </div>
      }
    >
      <div className="p-3">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-line-strong px-2.5 focus-within:border-brand">
          <Search className="size-4 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search participants"
            aria-label="Search participants"
            className="w-full bg-transparent text-sm outline-none placeholder:text-subtle"
          />
        </label>
      </div>
      <ul className="px-2 pb-2">
        {visible.map((p) => {
          const isMe = p.id === selfId;
          const tags = [p.role === "host" && "Host", isMe && "me"].filter(Boolean).join(", ");
          return (
            <li key={p.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-canvas" data-testid="participant-row">
              <Avatar name={p.display_name} className="size-8 text-xs" />
              <p className="min-w-0 flex-1 truncate text-sm">
                {p.display_name}
                {tags && <span className="text-muted"> ({tags})</span>}
              </p>

              {isHost && !isMe ? (
                <div className="flex gap-1 md:hidden md:group-focus-within:flex md:group-hover:flex">
                  {!p.is_muted && (
                    <Button size="sm" variant="secondary" className="h-7 px-2 text-[12px]" onClick={() => onMute(p)}>
                      Mute
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" className="h-7 px-2 text-[12px] text-danger" onClick={() => setToRemove(p)}>
                    Remove
                  </Button>
                </div>
              ) : null}

              <span className={isHost && !isMe ? "flex items-center gap-1.5 text-muted md:group-focus-within:hidden md:group-hover:hidden" : "flex items-center gap-1.5 text-muted"}>
                {p.hand_raised && <Hand className="size-4 text-[#e6a500]" aria-label="Hand raised" />}
                {p.is_muted ? <MicOff className="size-4 text-danger" aria-label="Muted" /> : <Mic className="size-4" aria-label="Unmuted" />}
                {p.is_video_on ? <Video className="size-4" aria-label="Video on" /> : <VideoOff className="size-4 text-danger" aria-label="Video off" />}
              </span>
            </li>
          );
        })}
        {visible.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No participants match “{query}”.</p>}
      </ul>

      <ConfirmDialog
        open={toRemove !== null}
        title="Remove participant?"
        confirmLabel="Remove"
        onClose={() => setToRemove(null)}
        onConfirm={() => {
          if (toRemove) onRemove(toRemove);
        }}
      >
        Do you want to remove <strong className="text-ink">{toRemove?.display_name}</strong> from the meeting?
      </ConfirmDialog>
    </SidePanel>
  );
}

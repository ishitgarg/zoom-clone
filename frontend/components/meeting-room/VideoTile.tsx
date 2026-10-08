"use client";

import { Hand, MicOff } from "lucide-react";
import { useEffect, useState } from "react";

import { StreamVideo } from "@/components/meeting-room/MediaElements";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { useReactionBurst } from "@/lib/meeting/useReactionBurst";
import type { Participant } from "@/types/api";

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  showVideo: boolean;
  isSelf?: boolean;
  mirrored?: boolean;
  speaking?: boolean;
  compact?: boolean;
  /** Screen shares are letterboxed rather than cropped. */
  contain?: boolean;
  connection?: RTCPeerConnectionState;
  style?: React.CSSProperties;
  className?: string;
}

export function VideoTile({
  participant,
  stream,
  showVideo,
  isSelf,
  mirrored,
  speaking,
  compact,
  contain,
  connection,
  style,
  className,
}: VideoTileProps) {
  const reaction = useReactionBurst(participant.reaction, participant.reaction_at);
  const label = `${participant.display_name}${isSelf ? " (You)" : ""}`;

  return (
    <div
      style={style}
      data-testid="video-tile"
      className={cn(
        "relative overflow-hidden rounded-lg bg-room-tile ring-2 transition-shadow",
        speaking ? "ring-success" : "ring-transparent",
        className,
      )}
    >
      {showVideo && stream ? (
        <StreamVideo stream={stream} mirrored={mirrored} className={contain ? "object-contain bg-black" : undefined} />
      ) : (
        <div className="grid size-full place-items-center">
          <Avatar
            name={participant.display_name}
            className={cn(
              "font-normal",
              compact ? "size-10 text-lg" : "size-[clamp(56px,9vw,120px)] text-[clamp(24px,4vw,52px)]",
            )}
          />
        </div>
      )}

      {/* Re-mounted whenever the connection comes up, so its timeout starts fresh next time. */}
      <ConnectionBadge key={connection === "connected" ? "up" : "down"} state={connection} />

      {participant.hand_raised && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-[#ffb800] px-1.5 py-1 text-black" aria-label="Hand raised">
          <Hand className="size-3.5" />
        </span>
      )}

      {reaction.emoji && (
        <span key={reaction.key} className="pointer-events-none absolute top-2 right-3 animate-float-up text-[34px]" aria-hidden>
          {reaction.emoji}
        </span>
      )}

      <div className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[12px] text-white">
        {participant.is_muted && <MicOff className="size-3 shrink-0 text-[#ff5a5a]" aria-label="Muted" />}
        <span className="truncate">{label}</span>
      </div>
    </div>
  );
}

const CONNECT_TIMEOUT_MS = 15_000;

/** Shown on other people's tiles until their audio/video connection is up. */
function ConnectionBadge({ state }: { state?: RTCPeerConnectionState }) {
  const [slow, setSlow] = useState(false);
  const pending = Boolean(state) && state !== "connected" && state !== "closed";

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setSlow(true), CONNECT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  if (!pending) return null;
  const failed = slow || state === "failed" || state === "disconnected";
  return (
    <span
      role="status"
      className={cn(
        "absolute top-2 left-1/2 max-w-[calc(100%-16px)] -translate-x-1/2 truncate rounded-md px-2 py-0.5 text-[11px] font-medium",
        failed ? "bg-danger/90 text-white" : "bg-black/60 text-white/90",
      )}
    >
      {failed ? "Can't connect audio/video" : "Connecting audio/video…"}
    </span>
  );
}

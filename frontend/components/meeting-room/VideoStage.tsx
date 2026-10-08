"use client";

import { useRef } from "react";

import { RemoteAudio } from "@/components/meeting-room/MediaElements";
import { VideoTile } from "@/components/meeting-room/VideoTile";
import { useGalleryLayout } from "@/lib/meeting/useGalleryLayout";
import type { LocalMedia } from "@/lib/meeting/useLocalMedia";
import type { Participant } from "@/types/api";

export type ViewMode = "gallery" | "speaker";

interface TileModel {
  participant: Participant;
  stream: MediaStream | null;
  showVideo: boolean;
  isSelf: boolean;
  mirrored: boolean;
  contain: boolean;
  /** Peer-to-peer connection state (undefined for your own tile). */
  connection?: RTCPeerConnectionState;
}

interface Props {
  participants: Participant[];
  selfId: number;
  media: LocalMedia;
  remoteStreams: Record<number, MediaStream>;
  connectionStates: Record<number, RTCPeerConnectionState>;
  view: ViewMode;
  speaking: boolean;
}

/** Builds what each tile should show from the roster + local/remote media. */
function buildTiles({ participants, selfId, media, remoteStreams, connectionStates }: Props): TileModel[] {
  const sharing = Boolean(media.screenStream);
  const tiles = participants.map((participant): TileModel => {
    if (participant.id === selfId) {
      return {
        participant,
        stream: media.screenStream ?? media.stream,
        showVideo: sharing || media.videoEnabled,
        isSelf: true,
        mirrored: !sharing,
        contain: sharing,
      };
    }
    const stream = remoteStreams[participant.id] ?? null;
    const hasVideoTrack = Boolean(stream?.getVideoTracks().length);
    return {
      participant,
      stream,
      showVideo: hasVideoTrack && (participant.is_video_on || participant.is_screen_sharing),
      isSelf: false,
      mirrored: false,
      contain: participant.is_screen_sharing,
      // No connection yet (e.g. waiting for their offer) counts as "connecting".
      connection: connectionStates[participant.id] ?? "new",
    };
  });
  // You first, like Zoom's gallery.
  return tiles.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
}

export function VideoStage(props: Props) {
  const tiles = buildTiles(props);
  const sharer = tiles.find((t) => !t.isSelf && t.participant.is_screen_sharing) ?? tiles.find((t) => t.isSelf && t.contain);
  const useSpeaker = (props.view === "speaker" || Boolean(sharer)) && tiles.length > 1;

  return (
    <div className="relative min-h-0 flex-1">
      {/* Remote audio plays regardless of layout or whether video is on. */}
      {Object.entries(props.remoteStreams).map(([id, stream]) => (
        <RemoteAudio key={id} stream={stream} />
      ))}
      {useSpeaker ? (
        <SpeakerLayout tiles={tiles} featured={sharer ?? tiles.find((t) => !t.isSelf) ?? tiles[0]} speaking={props.speaking} />
      ) : (
        <GalleryLayout tiles={tiles} speaking={props.speaking} />
      )}
    </div>
  );
}

function GalleryLayout({ tiles, speaking }: { tiles: TileModel[]; speaking: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { tileWidth, gap } = useGalleryLayout(ref, tiles.length);
  return (
    <div ref={ref} className="absolute inset-2 flex flex-wrap content-center items-center justify-center sm:inset-3" style={{ gap }}>
      {tileWidth > 0 &&
        tiles.map((tile) => (
          <VideoTile
            key={tile.participant.id}
            {...tile}
            speaking={tile.isSelf && speaking}
            style={{ width: tileWidth, height: (tileWidth * 9) / 16 }}
          />
        ))}
    </div>
  );
}

function SpeakerLayout({ tiles, featured, speaking }: { tiles: TileModel[]; featured: TileModel; speaking: boolean }) {
  const others = tiles.filter((t) => t !== featured);
  return (
    <div className="absolute inset-2 flex flex-col gap-2 sm:inset-3">
      <div className="flex shrink-0 justify-center gap-2 overflow-x-auto pb-1">
        {others.map((tile) => (
          <VideoTile
            key={tile.participant.id}
            {...tile}
            compact
            speaking={tile.isSelf && speaking}
            className="aspect-video w-[132px] shrink-0 sm:w-[176px]"
          />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <VideoTile
          {...featured}
          speaking={featured.isSelf && speaking}
          className="aspect-video max-h-full w-full max-w-[calc((100dvh-220px)*16/9)]"
        />
      </div>
    </div>
  );
}

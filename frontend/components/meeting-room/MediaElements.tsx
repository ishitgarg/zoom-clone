"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/cn";

/** <video> bound to a MediaStream. Always muted: audio is played by <RemoteAudio>. */
export function StreamVideo({ stream, mirrored, className }: { stream: MediaStream; mirrored?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn("size-full object-cover", mirrored && "-scale-x-100", className)}
    />
  );
}

/** Plays a remote participant's audio, independent of whether their video tile is visible. */
export function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

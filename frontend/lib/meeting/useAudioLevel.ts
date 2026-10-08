"use client";

import { useEffect, useState } from "react";

/** 0..1 loudness of the stream's audio track, for the "speaking" indicator on the mic icon. */
export function useAudioLevel(stream: MediaStream | null, enabled: boolean): number {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const track = stream?.getAudioTracks()[0];
    if (!track || !enabled || typeof AudioContext === "undefined") return;

    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const samples = new Uint8Array(analyser.frequencyBinCount);

    let frame = 0;
    let last = 0;
    const tick = () => {
      analyser.getByteFrequencyData(samples);
      const average = samples.reduce((sum, v) => sum + v, 0) / samples.length;
      const next = Math.round(Math.min(1, average / 60) * 10) / 10; // 0.1 steps -> fewer re-renders
      if (next !== last) {
        last = next;
        setLevel(next);
      }
      frame = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      void context.close();
      setLevel(0);
    };
  }, [stream, enabled]);

  return enabled ? level : 0;
}

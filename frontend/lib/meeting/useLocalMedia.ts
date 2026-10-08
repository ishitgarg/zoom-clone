"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type DeviceKind = "audioinput" | "videoinput";
/** Why a camera or microphone couldn't be used. */
export type DeviceProblem = "in-use" | "blocked" | "not-found" | "unsupported";

export interface LocalMedia {
  /** Camera + microphone stream (either track may be missing). */
  stream: MediaStream | null;
  screenStream: MediaStream | null;
  hasAudio: boolean;
  hasVideo: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  micProblem: DeviceProblem | null;
  cameraProblem: DeviceProblem | null;
  ready: boolean;
  setAudioEnabled: (enabled: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  /** Try again to get a camera/microphone that failed earlier (e.g. it was busy). Returns the problem, if any. */
  retryDevice: (kind: DeviceKind) => Promise<DeviceProblem | null>;
  /** Switch to a specific microphone/camera picked from the toolbar menu. */
  switchDevice: (kind: DeviceKind, deviceId: string) => Promise<DeviceProblem | null>;
  activeDeviceId: (kind: DeviceKind) => string | undefined;
  startScreenShare: () => Promise<MediaStream | null>;
  stopScreenShare: () => void;
  stopAll: () => void;
}

const VIDEO_CONSTRAINTS: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };

function toProblem(error: unknown): DeviceProblem {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "not-found";
  // NotReadableError / AbortError: usually another app or browser window is using the device.
  return "in-use";
}

/** A message that tells the user what went wrong and how to fix it. */
export function deviceProblemMessage(kind: DeviceKind, problem: DeviceProblem): string {
  const device = kind === "videoinput" ? "camera" : "microphone";
  switch (problem) {
    case "in-use":
      return `Your ${device} is being used by another app or browser window. Close it, then try again.`;
    case "blocked":
      return `${device === "camera" ? "Camera" : "Microphone"} access is blocked. Allow it from the icon in your browser's address bar, then try again.`;
    case "not-found":
      return `No ${device} was found on this device.`;
    case "unsupported":
      return "This browser can't access cameras or microphones. Try a recent version of Chrome, Edge or Firefox.";
  }
}

async function getTrack(kind: DeviceKind, deviceId?: string): Promise<MediaStreamTrack> {
  const constraints: MediaStreamConstraints =
    kind === "audioinput"
      ? { audio: deviceId ? { deviceId: { exact: deviceId } } : true }
      : { video: deviceId ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } } : VIDEO_CONSTRAINTS };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  return kind === "audioinput" ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
}

/** Ask for camera + mic together; if that fails, ask for each separately so one bad device
 * (e.g. a busy camera) doesn't also cost us the other. */
async function requestInitialMedia() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { stream: null, micProblem: "unsupported" as const, cameraProblem: "unsupported" as const };
  }
  try {
    const both = await navigator.mediaDevices.getUserMedia({ audio: true, video: VIDEO_CONSTRAINTS });
    return { stream: both, micProblem: null, cameraProblem: null };
  } catch {
    const tracks: MediaStreamTrack[] = [];
    let micProblem: DeviceProblem | null = null;
    let cameraProblem: DeviceProblem | null = null;
    try {
      tracks.push(await getTrack("audioinput"));
    } catch (error) {
      micProblem = toProblem(error);
    }
    try {
      tracks.push(await getTrack("videoinput"));
    } catch (error) {
      cameraProblem = toProblem(error);
    }
    return { stream: tracks.length ? new MediaStream(tracks) : null, micProblem, cameraProblem };
  }
}

/**
 * Owns this browser's camera, microphone and screen-share tracks.
 * Muting/turning video off disables the track (rather than stopping it) so peer connections
 * keep working without renegotiation. Whenever a track is replaced we create a new
 * MediaStream object, so React (and the WebRTC hook) notice the change.
 */
export function useLocalMedia(initial: { audio: boolean; video: boolean }): LocalMedia {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioState] = useState(initial.audio);
  const [videoEnabled, setVideoState] = useState(initial.video);
  const [micProblem, setMicProblem] = useState<DeviceProblem | null>(null);
  const [cameraProblem, setCameraProblem] = useState<DeviceProblem | null>(null);
  const [ready, setReady] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const screenRef = useRef<MediaStream | null>(null);
  const initialRef = useRef(initial);

  useEffect(() => {
    let cancelled = false;
    requestInitialMedia().then((result) => {
      if (cancelled) {
        result.stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      result.stream?.getAudioTracks().forEach((t) => (t.enabled = initialRef.current.audio));
      result.stream?.getVideoTracks().forEach((t) => (t.enabled = initialRef.current.video));
      streamRef.current = result.stream;
      setStream(result.stream);
      setMicProblem(result.micProblem);
      setCameraProblem(result.cameraProblem);
      setReady(true);
    });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const hasAudio = Boolean(stream?.getAudioTracks().length);
  const hasVideo = Boolean(stream?.getVideoTracks().length);

  const setAudioEnabled = useCallback((enabled: boolean) => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setAudioState(enabled);
  }, []);

  const setVideoEnabled = useCallback((enabled: boolean) => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setVideoState(enabled);
  }, []);

  /** Get a new mic/camera track and put it in place of the old one (if any). */
  const replaceTrack = useCallback(
    async (kind: DeviceKind, deviceId: string | undefined, enabled: boolean): Promise<DeviceProblem | null> => {
      if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
      const isAudio = kind === "audioinput";
      try {
        const track = await getTrack(kind, deviceId);
        const current = streamRef.current;
        const kept = current ? (isAudio ? current.getVideoTracks() : current.getAudioTracks()) : [];
        const old = current ? (isAudio ? current.getAudioTracks() : current.getVideoTracks()) : [];
        old.forEach((t) => t.stop());
        track.enabled = enabled;
        const next = new MediaStream([...kept, track]);
        streamRef.current = next;
        setStream(next);
        (isAudio ? setMicProblem : setCameraProblem)(null);
        (isAudio ? setAudioState : setVideoState)(enabled);
        return null;
      } catch (error) {
        return toProblem(error);
      }
    },
    [],
  );

  const retryDevice = useCallback(
    async (kind: DeviceKind) => {
      const problem = await replaceTrack(kind, undefined, true);
      if (problem) (kind === "audioinput" ? setMicProblem : setCameraProblem)(problem);
      return problem;
    },
    [replaceTrack],
  );

  const switchDevice = useCallback(
    (kind: DeviceKind, deviceId: string) => {
      const current = streamRef.current;
      const track = kind === "audioinput" ? current?.getAudioTracks()[0] : current?.getVideoTracks()[0];
      return replaceTrack(kind, deviceId, track?.enabled ?? true);
    },
    [replaceTrack],
  );

  const activeDeviceId = useCallback(
    (kind: DeviceKind) => {
      const track = kind === "audioinput" ? stream?.getAudioTracks()[0] : stream?.getVideoTracks()[0];
      return track?.getSettings().deviceId;
    },
    [stream],
  );

  const stopScreenShare = useCallback(() => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!navigator.mediaDevices?.getDisplayMedia) return null;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      // The browser's own "Stop sharing" button ends the track.
      display.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare);
      screenRef.current = display;
      setScreenStream(display);
      return display;
    } catch {
      return null; // user cancelled the picker
    }
  }, [stopScreenShare]);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    stopScreenShare();
  }, [stopScreenShare]);

  return {
    stream,
    screenStream,
    hasAudio,
    hasVideo,
    audioEnabled: hasAudio && audioEnabled,
    videoEnabled: hasVideo && videoEnabled,
    micProblem,
    cameraProblem,
    ready,
    setAudioEnabled,
    setVideoEnabled,
    retryDevice,
    switchDevice,
    activeDeviceId,
    startScreenShare,
    stopScreenShare,
    stopAll,
  };
}

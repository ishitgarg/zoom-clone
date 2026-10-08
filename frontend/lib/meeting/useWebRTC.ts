"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { signalsApi } from "@/lib/api/participants";
import { SIGNAL_POLL_INTERVAL_MS } from "@/lib/config";
import type { Participant, Signal } from "@/types/api";

/**
 * Peer-to-peer audio/video between meeting participants (a "mesh": one RTCPeerConnection per
 * pair of participants). The backend only relays signalling messages (offer / answer / ICE
 * candidates); media flows directly between browsers.
 *
 * This hook is deliberately isolated: if WebRTC fails (blocked network, no TURN server), the
 * rest of the meeting — roster, chat, host controls — keeps working, and tiles fall back to
 * showing the participant's name.
 *
 * To avoid both sides making an offer at once, the participant with the higher id always
 * makes the offer and the other side answers.
 */

const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

interface Peer {
  pc: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
}

interface Options {
  meetingId: string;
  token: string;
  selfId: number;
  participants: Participant[];
  localStream: MediaStream | null;
  /** When screen sharing, this track is sent instead of the camera. */
  screenTrack: MediaStreamTrack | null;
}

const RECONNECT_DELAY_MS = 3000;

export function useWebRTC({ meetingId, token, selfId, participants, localStream, screenTrack }: Options) {
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  // Connection state per participant, so tiles can show "Connecting…" / "Can't connect".
  const [connectionStates, setConnectionStates] = useState<Record<number, RTCPeerConnectionState>>({});
  const peers = useRef(new Map<number, Peer>());
  const currentOthers = useRef(new Set<number>());

  const cameraTrack = localStream?.getVideoTracks()[0] ?? null;
  const audioTrack = localStream?.getAudioTracks()[0] ?? null;
  const videoTrack = screenTrack ?? cameraTrack;

  // Everything the async signalling handlers need, kept in a ref so they always see live values.
  const ctx = useRef({ meetingId, token, selfId, audioTrack, videoTrack });
  useLayoutEffect(() => {
    ctx.current = { meetingId, token, selfId, audioTrack, videoTrack };
  });

  // ---------------------------------------------------------------- peer lifecycle

  const send = (peerId: number, kind: Signal["kind"], payload: unknown) =>
    signalsApi.send(ctx.current.meetingId, ctx.current.token, peerId, kind, payload).catch(() => undefined);

  const setConnectionState = (peerId: number, state: RTCPeerConnectionState | null) =>
    setConnectionStates((states) => {
      const next = { ...states };
      if (state) next[peerId] = state;
      else delete next[peerId];
      return next;
    });

  const closePeer = (peerId: number, keepState = false) => {
    peers.current.get(peerId)?.pc.close();
    peers.current.delete(peerId);
    if (!keepState) setConnectionState(peerId, null);
    setRemoteStreams((streams) => {
      if (!(peerId in streams)) return streams;
      const next = { ...streams };
      delete next[peerId];
      return next;
    });
  };

  /** Attach our current tracks to the audio/video transceivers created by the remote offer. */
  const attachLocalTracks = (pc: RTCPeerConnection) => {
    const stream = new MediaStream();
    for (const transceiver of pc.getTransceivers()) {
      const kind = transceiver.receiver.track.kind;
      transceiver.direction = "sendrecv";
      transceiver.sender.setStreams?.(stream); // so the other side receives audio+video as one stream
      void transceiver.sender.replaceTrack(kind === "audio" ? ctx.current.audioTrack : ctx.current.videoTrack);
    }
  };

  const createPeer = (peerId: number): Peer => {
    closePeer(peerId);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer: Peer = { pc, pendingCandidates: [] };
    peers.current.set(peerId, peer);

    pc.onicecandidate = (event) => {
      if (event.candidate) void send(peerId, "candidate", event.candidate.toJSON());
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      setRemoteStreams((streams) => {
        const existing = streams[peerId];
        if (existing && existing !== stream) {
          if (!existing.getTracks().includes(event.track)) existing.addTrack(event.track);
          return { ...streams };
        }
        return { ...streams, [peerId]: stream };
      });
    };
    setConnectionState(peerId, "new");
    pc.onconnectionstatechange = () => {
      if (peers.current.get(peerId)?.pc !== pc) return; // an old, replaced connection
      setConnectionState(peerId, pc.connectionState);
      if (pc.connectionState === "failed") {
        // Tear it down; the offering side tries again after a short pause.
        closePeer(peerId, true);
        if (ctx.current.selfId > peerId) {
          window.setTimeout(() => {
            if (currentOthers.current.has(peerId) && !peers.current.has(peerId)) {
              void makeOffer(peerId).catch(() => closePeer(peerId, true));
            }
          }, RECONNECT_DELAY_MS);
        }
      }
    };
    return peer;
  };

  const makeOffer = async (peerId: number) => {
    const { pc } = createPeer(peerId);
    // Always negotiate one audio + one video transceiver so tracks can be swapped later
    // (mute, camera off, screen share) with replaceTrack and no renegotiation.
    const stream = new MediaStream();
    pc.addTransceiver(ctx.current.audioTrack ?? "audio", { direction: "sendrecv", streams: [stream] });
    pc.addTransceiver(ctx.current.videoTrack ?? "video", { direction: "sendrecv", streams: [stream] });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await send(peerId, "offer", pc.localDescription?.toJSON());
  };

  const flushCandidates = async (peer: Peer) => {
    for (const candidate of peer.pendingCandidates.splice(0)) {
      await peer.pc.addIceCandidate(candidate).catch(() => undefined);
    }
  };

  const handleSignal = async (signal: Signal) => {
    const payload = JSON.parse(signal.payload);
    const peerId = signal.sender_id;

    if (signal.kind === "offer") {
      const peer = createPeer(peerId);
      await peer.pc.setRemoteDescription(payload);
      attachLocalTracks(peer.pc);
      const answer = await peer.pc.createAnswer();
      await peer.pc.setLocalDescription(answer);
      await send(peerId, "answer", peer.pc.localDescription?.toJSON());
      await flushCandidates(peer);
      return;
    }

    const peer = peers.current.get(peerId);
    if (!peer) return;
    if (signal.kind === "answer") {
      if (peer.pc.signalingState === "have-local-offer") {
        await peer.pc.setRemoteDescription(payload);
        await flushCandidates(peer);
      }
    } else if (peer.pc.remoteDescription) {
      await peer.pc.addIceCandidate(payload).catch(() => undefined);
    } else {
      peer.pendingCandidates.push(payload);
    }
  };

  // ---------------------------------------------------------------- effects

  // Connect to new participants and drop those who left.
  const rosterKey = participants
    .filter((p) => p.id !== selfId)
    .map((p) => p.id)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (typeof RTCPeerConnection === "undefined") return;
    const others = new Set(rosterKey ? rosterKey.split(",").map(Number) : []);
    currentOthers.current = others;
    for (const peerId of [...peers.current.keys()]) {
      if (!others.has(peerId)) closePeer(peerId);
    }
    for (const peerId of others) {
      if (!peers.current.has(peerId) && selfId > peerId) void makeOffer(peerId).catch(() => closePeer(peerId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers read live values from refs
  }, [rosterKey, selfId]);

  // Poll for signalling messages addressed to us.
  useEffect(() => {
    if (typeof RTCPeerConnection === "undefined") return;
    let stopped = false;
    let timer: number | undefined;
    let afterId = 0;
    const poll = async () => {
      try {
        const signals = await signalsApi.receive(meetingId, token, afterId);
        for (const signal of signals) {
          afterId = signal.id;
          await handleSignal(signal).catch(() => undefined);
        }
      } catch {
        // retried on the next tick
      }
      if (!stopped) timer = window.setTimeout(poll, SIGNAL_POLL_INTERVAL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleSignal reads live values from refs
  }, [meetingId, token]);

  // Swap outgoing tracks on every open connection when they change
  // (camera <-> screen share, or a different microphone/camera picked from the toolbar).
  useEffect(() => {
    for (const { pc } of peers.current.values()) {
      for (const transceiver of pc.getTransceivers()) {
        const track = transceiver.receiver.track.kind === "audio" ? audioTrack : videoTrack;
        if (transceiver.sender.track !== track) void transceiver.sender.replaceTrack(track).catch(() => undefined);
      }
    }
  }, [audioTrack, videoTrack]);

  // Close everything when leaving the meeting.
  useEffect(() => {
    const current = peers.current;
    return () => {
      for (const { pc } of current.values()) pc.close();
      current.clear();
    };
  }, []);

  return { remoteStreams, connectionStates };
}

"use client";

import { MonitorUp, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatPanel } from "@/components/meeting-room/ChatPanel";
import { InviteDialog } from "@/components/meeting-room/InviteDialog";
import { MeetingToolbar } from "@/components/meeting-room/MeetingToolbar";
import { MeetingTopBar } from "@/components/meeting-room/MeetingTopBar";
import { ParticipantsPanel } from "@/components/meeting-room/ParticipantsPanel";
import { VideoStage, type ViewMode } from "@/components/meeting-room/VideoStage";
import { useToast } from "@/components/ui/Toast";
import { copyToClipboard } from "@/lib/clipboard";
import type { StoredSession } from "@/lib/meeting/session-store";
import { useAudioLevel } from "@/lib/meeting/useAudioLevel";
import { useChat } from "@/lib/meeting/useChat";
import { deviceProblemMessage, type LocalMedia } from "@/lib/meeting/useLocalMedia";
import { useMeetingPresence, type ExitReason } from "@/lib/meeting/useMeetingPresence";
import { useWebRTC } from "@/lib/meeting/useWebRTC";
import type { Meeting, Participant } from "@/types/api";

type Panel = "participants" | "chat" | null;

interface Props {
  meeting: Meeting;
  session: StoredSession;
  initialSelf: Participant;
  media: LocalMedia;
  offerScreenShare: boolean;
  onExit: (reason: ExitReason) => void;
}

export function MeetingRoom({ meeting, session, initialSelf, media, offerScreenShare, onExit }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [shareOfferOpen, setShareOfferOpen] = useState(offerScreenShare);
  const [panel, setPanel] = useState<Panel>(null);
  const [view, setView] = useState<ViewMode>("gallery");
  const [inviteOpen, setInviteOpen] = useState(false);

  const presence = useMeetingPresence({
    meetingId: meeting.meeting_id,
    token: session.token,
    initialSelf,
    onExit,
    onMutedByHost: () => {
      media.setAudioEnabled(false);
      toast("The host has muted you");
    },
    onNotice: (message) => toast(message),
  });
  const { self, participants, updateSelf } = presence;

  const { remoteStreams, connectionStates } = useWebRTC({
    meetingId: meeting.meeting_id,
    token: session.token,
    selfId: self.id,
    participants,
    localStream: media.stream,
    screenTrack: media.screenStream?.getVideoTracks()[0] ?? null,
  });
  const chat = useChat(meeting.meeting_id, session.token, self.id, panel === "chat");
  const audioLevel = useAudioLevel(media.stream, media.audioEnabled);

  // ---------------------------------------------------------------- controls

  /** Turn a device on; if it wasn't available when we joined (busy/blocked), ask for it again. */
  const enableDevice = async (kind: "audioinput" | "videoinput"): Promise<boolean> => {
    const available = kind === "audioinput" ? media.hasAudio : media.hasVideo;
    if (available) return true;
    const problem = await media.retryDevice(kind);
    if (problem) toast(deviceProblemMessage(kind, problem), "error");
    return problem === null;
  };

  const toggleAudio = async () => {
    const enable = !media.audioEnabled;
    if (enable && !(await enableDevice("audioinput"))) return;
    media.setAudioEnabled(enable);
    void updateSelf({ is_muted: !enable });
  };

  const toggleVideo = async () => {
    const enable = !media.videoEnabled;
    if (enable && !(await enableDevice("videoinput"))) return;
    media.setVideoEnabled(enable);
    void updateSelf({ is_video_on: enable });
  };

  const toggleShare = async () => {
    if (media.screenStream) {
      media.stopScreenShare();
      return;
    }
    const otherSharer = participants.find((p) => p.id !== self.id && p.is_screen_sharing);
    if (otherSharer) {
      toast(`${otherSharer.display_name} is already sharing their screen`);
      return;
    }
    if (await media.startScreenShare()) void updateSelf({ is_screen_sharing: true });
  };

  // Screen sharing can also be stopped from the browser's own "Stop sharing" bar.
  const wasSharing = useRef(false);
  useEffect(() => {
    const sharing = Boolean(media.screenStream);
    if (wasSharing.current && !sharing) void updateSelf({ is_screen_sharing: false });
    wasSharing.current = sharing;
  }, [media.screenStream, updateSelf]);

  // Browsers only allow screen capture right after a click, so the "Share screen" tile
  // lands here and asks for one more click.
  const closeShareOffer = (share: boolean) => {
    setShareOfferOpen(false);
    router.replace(`/meeting/${meeting.meeting_id}`);
    if (share) void toggleShare();
  };

  const togglePanel = useCallback((next: "participants" | "chat") => setPanel((current) => (current === next ? null : next)), []);

  const copyInvite = async () => {
    const ok = await copyToClipboard(meeting.invite_url);
    toast(ok ? "Invite link copied" : "Couldn't copy to clipboard", ok ? "success" : "error");
  };

  const sharer = participants.find((p) => p.is_screen_sharing);
  const alone = participants.length <= 1;
  const hostName = participants.find((p) => p.role === "host")?.display_name ?? meeting.host.name;
  const canShareScreen = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

  return (
    <div className="fixed inset-0 flex flex-col bg-room text-room-text" data-testid="meeting-room">
      <MeetingTopBar
        meeting={meeting}
        self={self}
        hostName={hostName}
        view={view}
        onViewChange={setView}
        connectionLost={presence.connectionLost}
      />

      {sharer && (
        <div className="mx-auto -mt-1 mb-1 flex items-center gap-3 rounded-full bg-[#1f8f4e] px-4 py-1.5 text-[13px] font-medium text-white">
          <MonitorUp className="size-4" />
          {sharer.id === self.id ? "You are screen sharing" : `You are viewing ${sharer.display_name}'s screen`}
          {sharer.id === self.id && (
            <button type="button" onClick={toggleShare} className="rounded-full bg-danger px-3 py-0.5 text-[12px] font-semibold hover:bg-danger-hover">
              Stop Share
            </button>
          )}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-w-0 flex-1 flex-col">
          <VideoStage
            participants={participants}
            selfId={self.id}
            media={media}
            remoteStreams={remoteStreams}
            connectionStates={connectionStates}
            view={view}
            speaking={audioLevel > 0.3}
          />

          {alone && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
              <div className="pointer-events-auto flex max-w-md animate-pop-in flex-col items-center gap-3 rounded-2xl bg-[#2a2a2a]/95 px-6 py-5 text-center shadow-pop sm:flex-row sm:text-left">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Waiting for others to join</p>
                  <p className="mt-0.5 text-[12px] text-room-muted">Share the invite link and people will appear here.</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={copyInvite} className="h-8 rounded-lg bg-brand px-3 text-[13px] font-semibold text-white hover:bg-brand-hover">
                    Copy link
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteOpen(true)}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-room-hover px-3 text-[13px] font-semibold text-white hover:bg-[#3d3d3d]"
                  >
                    <UserPlus className="size-4" /> Invite
                  </button>
                </div>
              </div>
            </div>
          )}

          {(media.cameraProblem || media.micProblem) && (
            <p role="status" className="absolute top-2 left-1/2 w-[min(560px,calc(100%-24px))] -translate-x-1/2 rounded-lg bg-[#2a2a2a] px-3 py-2 text-center text-[12px] text-room-muted">
              {media.micProblem && deviceProblemMessage("audioinput", media.micProblem)}{" "}
              {media.cameraProblem && deviceProblemMessage("videoinput", media.cameraProblem)}
            </p>
          )}
        </div>

        {panel === "participants" && (
          <ParticipantsPanel
            participants={participants}
            selfId={self.id}
            isHost={presence.isHost}
            onClose={() => setPanel(null)}
            onInvite={() => setInviteOpen(true)}
            onMuteAll={presence.muteAll}
            onMute={presence.muteParticipant}
            onRemove={presence.removeParticipant}
          />
        )}
        {panel === "chat" && <ChatPanel messages={chat.messages} selfId={self.id} onSend={chat.send} onClose={() => setPanel(null)} />}
      </div>

      <MeetingToolbar
        media={media}
        participantCount={participants.length}
        unreadMessages={chat.unread}
        activePanel={panel}
        handRaised={self.hand_raised}
        isHost={presence.isHost}
        audioLevel={audioLevel}
        canShareScreen={canShareScreen}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onTogglePanel={togglePanel}
        onToggleShare={toggleShare}
        onReact={(emoji) => void updateSelf({ reaction: emoji })}
        onToggleHand={() => void updateSelf({ hand_raised: !self.hand_raised })}
        onLeave={presence.leave}
        onEndForAll={presence.endForAll}
        onMuteAll={presence.muteAll}
        onDeviceError={(message) => toast(message, "error")}
      />

      <InviteDialog meeting={meeting} open={inviteOpen} onClose={() => setInviteOpen(false)} />

      {shareOfferOpen && canShareScreen && (
        <div className="fixed inset-0 z-50 grid animate-fade-in place-items-center bg-black/60 px-4">
          <div role="dialog" aria-label="Share your screen" className="w-full max-w-sm animate-pop-in rounded-2xl bg-[#2a2a2a] p-6 text-center shadow-pop">
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-[#1f8f4e]">
              <MonitorUp className="size-7 text-white" />
            </span>
            <p className="text-[17px] font-semibold text-white">Share your screen</p>
            <p className="mt-1 text-sm text-room-muted">Choose a screen, window or tab to show to everyone in the meeting.</p>
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={() => closeShareOffer(false)} className="h-9 rounded-lg bg-room-hover px-4 text-sm font-semibold text-white hover:bg-[#3d3d3d]">
                Not now
              </button>
              <button type="button" onClick={() => closeShareOffer(true)} className="h-9 rounded-lg bg-[#1f8f4e] px-4 text-sm font-semibold text-white hover:bg-[#1a7a43]">
                Share Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

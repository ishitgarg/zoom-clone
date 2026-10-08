"use client";

import { Check, Hand, MessageSquare, Mic, MicOff, MonitorUp, Smile, Users, Video, VideoOff } from "lucide-react";
import { useState } from "react";

import { ToolbarPopover, popoverItem } from "@/components/meeting-room/Popover";
import { ToolbarButton } from "@/components/meeting-room/ToolbarButton";
import { cn } from "@/lib/cn";
import { deviceProblemMessage, type LocalMedia } from "@/lib/meeting/useLocalMedia";
import { useMediaDevices } from "@/lib/meeting/useMediaDevices";

export const REACTIONS = ["👏", "👍", "❤️", "😂", "😮", "🎉"] as const;

type Menu = "audio" | "video" | "reactions" | "leave" | null;

interface Props {
  media: LocalMedia;
  participantCount: number;
  unreadMessages: number;
  activePanel: "participants" | "chat" | null;
  handRaised: boolean;
  isHost: boolean;
  audioLevel: number;
  canShareScreen: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onTogglePanel: (panel: "participants" | "chat") => void;
  onToggleShare: () => void;
  onReact: (emoji: string) => void;
  onToggleHand: () => void;
  onLeave: () => void;
  onEndForAll: () => void;
  onDeviceError: (message: string) => void;
}

export function MeetingToolbar(props: Props) {
  const { media } = props;
  const [menu, setMenu] = useState<Menu>(null);
  const { devices, refresh } = useMediaDevices();
  const toggleMenu = (next: Menu) => {
    if (next === "audio" || next === "video") void refresh();
    setMenu((current) => (current === next ? null : next));
  };
  const closeMenu = () => setMenu(null);
  const sharing = Boolean(media.screenStream);

  const deviceMenu = (kind: "audioinput" | "videoinput", title: string) => {
    const list = devices.filter((d) => d.kind === kind);
    const activeId = media.activeDeviceId(kind);
    return (
      <div className="w-72">
        <p className="px-3 pt-1.5 pb-1 text-[12px] font-semibold text-room-muted">{title}</p>
        {list.length === 0 && <p className="px-3 py-2 text-room-muted">No devices found</p>}
        {list.map((device, index) => (
          <button
            key={device.deviceId || index}
            type="button"
            role="menuitemradio"
            aria-checked={device.deviceId === activeId}
            className={popoverItem}
            onClick={async () => {
              closeMenu();
              const problem = await media.switchDevice(kind, device.deviceId);
              if (problem) props.onDeviceError(deviceProblemMessage(kind, problem));
            }}
          >
            <Check className={cn("size-4 shrink-0", device.deviceId === activeId ? "opacity-100" : "opacity-0")} />
            <span className="truncate">{device.label || `${kind === "audioinput" ? "Microphone" : "Camera"} ${index + 1}`}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <footer className="relative z-30 flex h-[68px] shrink-0 items-center justify-between gap-1 bg-room-bar px-1 sm:h-[72px] sm:px-3">
      {/* Left: audio / video */}
      <div className="flex items-center">
        <ToolbarButton
          icon={media.audioEnabled ? Mic : MicOff}
          label={media.audioEnabled ? "Mute" : "Unmute"}
          danger={!media.audioEnabled}
          onClick={props.onToggleAudio}
          onMenuClick={() => toggleMenu("audio")}
          menuLabel="Audio settings"
          badge={
            media.audioEnabled && props.audioLevel > 0 ? (
              <span
                aria-hidden
                className="absolute bottom-[7px] left-1/2 w-[6px] -translate-x-1/2 rounded-full bg-success transition-[height]"
                style={{ height: `${Math.max(2, props.audioLevel * 9)}px` }}
              />
            ) : null
          }
        >
          <ToolbarPopover open={menu === "audio"} onClose={closeMenu} align="left">
            {deviceMenu("audioinput", "Select a microphone")}
          </ToolbarPopover>
        </ToolbarButton>
        <ToolbarButton
          icon={media.videoEnabled ? Video : VideoOff}
          label={media.videoEnabled ? "Stop Video" : "Start Video"}
          danger={!media.videoEnabled}
          onClick={props.onToggleVideo}
          onMenuClick={() => toggleMenu("video")}
          menuLabel="Video settings"
        >
          <ToolbarPopover open={menu === "video"} onClose={closeMenu} align="left">
            {deviceMenu("videoinput", "Select a camera")}
          </ToolbarPopover>
        </ToolbarButton>
      </div>

      {/* Centre: collaboration */}
      <div className="flex items-center">
        <ToolbarButton
          icon={Users}
          label="Participants"
          active={props.activePanel === "participants"}
          onClick={() => props.onTogglePanel("participants")}
          badge={
            <span className="absolute -top-1.5 -right-3 min-w-[18px] rounded-full bg-room-hover px-1 text-center text-[10px] leading-[16px] font-semibold text-white">
              {props.participantCount}
            </span>
          }
        />
        <ToolbarButton
          icon={MessageSquare}
          label="Chat"
          active={props.activePanel === "chat"}
          onClick={() => props.onTogglePanel("chat")}
          badge={
            props.unreadMessages > 0 ? (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] rounded-full bg-danger px-1 text-center text-[10px] leading-[16px] font-bold text-white">
                {props.unreadMessages > 9 ? "9+" : props.unreadMessages}
              </span>
            ) : null
          }
        />
        {props.canShareScreen && (
          <ToolbarButton
            icon={MonitorUp}
            label={sharing ? "Stop Share" : "Share"}
            onClick={props.onToggleShare}
            iconClassName={cn("size-[26px] rounded-md p-1 text-white", sharing ? "bg-danger" : "bg-[#1f8f4e]")}
            className="hidden sm:flex"
          />
        )}
        <ToolbarButton icon={Smile} label="React" onClick={() => toggleMenu("reactions")} active={props.handRaised}>
          <ToolbarPopover open={menu === "reactions"} onClose={closeMenu}>
            <div className="flex gap-1 p-1">
              {REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`React with ${emoji}`}
                  onClick={() => {
                    props.onReact(emoji);
                    closeMenu();
                  }}
                  className="grid size-10 place-items-center rounded-lg text-[22px] hover:bg-room-hover"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={cn(popoverItem, "mt-1 justify-center bg-room-hover/60")}
              onClick={() => {
                props.onToggleHand();
                closeMenu();
              }}
            >
              <Hand className="size-4 text-[#ffb800]" /> {props.handRaised ? "Lower Hand" : "Raise Hand"}
            </button>
          </ToolbarPopover>
        </ToolbarButton>
      </div>

      {/* Right: leave */}
      <div className="relative flex items-center pr-1">
        <button
          type="button"
          onClick={() => toggleMenu("leave")}
          className="h-9 rounded-lg bg-danger px-3.5 text-[13px] font-semibold text-white hover:bg-danger-hover sm:px-4"
        >
          {props.isHost ? "End" : "Leave"}
        </button>
        <ToolbarPopover open={menu === "leave"} onClose={closeMenu} align="right" className="w-64 p-3">
          {props.isHost && (
            <button
              type="button"
              onClick={props.onEndForAll}
              className="mb-2 h-10 w-full rounded-lg bg-danger font-semibold text-white hover:bg-danger-hover"
            >
              End meeting for all
            </button>
          )}
          <button
            type="button"
            onClick={props.onLeave}
            className={cn(
              "h-10 w-full rounded-lg font-semibold",
              props.isHost ? "bg-room-hover text-white hover:bg-[#3d3d3d]" : "bg-danger text-white hover:bg-danger-hover",
            )}
          >
            Leave meeting
          </button>
          {props.isHost && (
            <p className="mt-2 text-center text-[11px] text-room-muted">If you leave, another participant becomes host.</p>
          )}
        </ToolbarPopover>
      </div>
    </footer>
  );
}

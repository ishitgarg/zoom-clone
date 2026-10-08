"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useState, type FormEvent } from "react";

import { StreamVideo } from "@/components/meeting-room/MediaElements";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormError, TextInput } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { formatMeetingId } from "@/lib/format";
import { deviceProblemMessage, type LocalMedia } from "@/lib/meeting/useLocalMedia";
import type { Meeting } from "@/types/api";

interface Props {
  meeting: Meeting;
  media: LocalMedia;
  defaultName: string;
  error: string | null;
  joining: boolean;
  onJoin: (name: string, rememberName: boolean) => void;
}

/** Zoom web client style preview: check camera/mic, enter your name, then join. */
export function PreJoinScreen({ meeting, media, defaultName, error, joining, onJoin }: Props) {
  const [name, setName] = useState(defaultName);
  const [nameError, setNameError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);

  /** Turn mic/camera on or off; if it wasn't available (busy or blocked), ask for it again. */
  const toggle = async (kind: "audioinput" | "videoinput") => {
    const isAudio = kind === "audioinput";
    const enabled = isAudio ? media.audioEnabled : media.videoEnabled;
    const available = isAudio ? media.hasAudio : media.hasVideo;
    if (!enabled && !available) {
      await media.retryDevice(kind); // on failure the problem message below updates
      return;
    }
    if (isAudio) media.setAudioEnabled(!enabled);
    else media.setVideoEnabled(!enabled);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setNameError("Please enter your name.");
      return;
    }
    onJoin(name.trim(), remember);
  };

  const roundButton = (on: boolean) =>
    cn(
      "grid size-11 place-items-center rounded-full transition-colors disabled:opacity-40",
      on ? "bg-white/15 text-white hover:bg-white/25" : "bg-danger text-white hover:bg-danger-hover",
    );

  return (
    <main className="mx-auto grid w-full max-w-[980px] items-center gap-8 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:py-16">
      <div>
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#1f1f1f] shadow-pop">
          {!media.ready ? (
            <div className="grid size-full place-items-center text-sm text-white/70">
              <span className="flex items-center gap-2">
                <Spinner /> Starting camera...
              </span>
            </div>
          ) : media.videoEnabled && media.stream ? (
            <StreamVideo stream={media.stream} mirrored />
          ) : (
            <div className="grid size-full place-items-center">
              <Avatar name={name || "?"} className="size-20 text-2xl" />
            </div>
          )}
          <span className="absolute top-3 left-3 rounded bg-black/55 px-2 py-0.5 text-[12px] text-white">{name || "Your name"}</span>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
            <button
              type="button"
              aria-label={media.audioEnabled ? "Mute microphone" : "Unmute microphone"}
              onClick={() => toggle("audioinput")}
              className={roundButton(media.audioEnabled)}
            >
              {media.audioEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
            </button>
            <button
              type="button"
              aria-label={media.videoEnabled ? "Turn camera off" : "Turn camera on"}
              onClick={() => toggle("videoinput")}
              className={roundButton(media.videoEnabled)}
            >
              {media.videoEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
            </button>
          </div>
        </div>
        {(media.micProblem || media.cameraProblem) && (
          <div role="status" className="mt-3 space-y-1 text-[13px] text-muted">
            {media.micProblem && <p>{deviceProblemMessage("audioinput", media.micProblem)}</p>}
            {media.cameraProblem && <p>{deviceProblemMessage("videoinput", media.cameraProblem)}</p>}
            <p>You can still join, see and hear others, and chat.</p>
          </div>
        )}
      </div>

      <form onSubmit={submit} noValidate className="space-y-5">
        <div>
          <p className="text-[13px] font-semibold text-brand">Join meeting</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{meeting.title}</h1>
          <p className="mt-1.5 text-sm text-muted">
            Meeting ID {formatMeetingId(meeting.meeting_id)} · Hosted by {meeting.host.name}
          </p>
          {meeting.status === "live" && meeting.active_participant_count > 0 && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[12px] font-semibold text-success">
              <span className="size-1.5 rounded-full bg-success" />
              {meeting.active_participant_count} {meeting.active_participant_count === 1 ? "person" : "people"} in the meeting
            </p>
          )}
        </div>
        <FormError message={error} />
        <Field label="Your name" htmlFor="prejoin-name" error={nameError}>
          <TextInput
            id="prejoin-name"
            autoFocus
            maxLength={50}
            value={name}
            invalid={Boolean(nameError)}
            placeholder="Enter your name"
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
          />
        </Field>
        <Checkbox id="prejoin-remember" label="Remember my name for future meetings" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <Button type="submit" size="lg" className="w-full" loading={joining} loadingText="Joining meeting..." disabled={!media.ready}>
          Join
        </Button>
      </form>
    </main>
  );
}

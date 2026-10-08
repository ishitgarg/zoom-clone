"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, FormError, TextInput } from "@/components/ui/FormField";
import { ApiError, errorMessage } from "@/lib/api/client";
import { meetingsApi } from "@/lib/api/meetings";
import { participantsApi } from "@/lib/api/participants";
import { parseMeetingInput } from "@/lib/format";
import { saveSession } from "@/lib/meeting/session-store";
import { loadPreferences, savePreferences } from "@/lib/preferences";

/**
 * Zoom's "Join meeting" form: meeting ID or invite link + display name + audio/video options.
 * The meeting is validated against the backend before we join and navigate.
 */
interface JoinMeetingFormProps {
  initialMeetingId?: string;
  onCancel?: () => void;
  /** "Share screen" tile: join, then offer to start sharing straight away. */
  shareScreen?: boolean;
}

export function JoinMeetingForm({ initialMeetingId = "", onCancel, shareScreen = false }: JoinMeetingFormProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [prefs] = useState(loadPreferences);

  const [meetingInput, setMeetingInput] = useState(initialMeetingId);
  const [name, setName] = useState(prefs.displayName || user?.name || "");
  const [nameTouched, setNameTouched] = useState(false);
  const [rememberName, setRememberName] = useState(Boolean(prefs.displayName));
  const [muted, setMuted] = useState(prefs.joinWithMicMuted);
  const [videoOff, setVideoOff] = useState(prefs.joinWithVideoOff);

  const [idError, setIdError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fill in the profile name once it loads, unless the user already typed something.
  const displayName = nameTouched ? name : name || user?.name || "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const meetingId = parseMeetingInput(meetingInput);
    const trimmedName = displayName.trim();
    setIdError(meetingId ? null : "Enter a valid meeting ID (9–11 digits) or invite link.");
    setNameError(trimmedName ? null : "Please enter your name.");
    if (!meetingId || !trimmedName) return;

    setSubmitting(true);
    let navigating = false;
    try {
      // 1. Validate that the meeting exists (404 -> "Meeting not found...").
      try {
        await meetingsApi.get(meetingId);
      } catch (error) {
        if (error instanceof ApiError && (error.isNotFound || error.status === 422)) {
          setIdError(error.message);
          return;
        }
        throw error;
      }
      // 2. Join it and remember this tab's participant session.
      const joined = await participantsApi.join(meetingId, {
        display_name: trimmedName,
        is_muted: muted,
        is_video_on: !videoOff,
      });
      saveSession(meetingId, { participantId: joined.participant.id, token: joined.session_token });
      savePreferences({ displayName: rememberName ? trimmedName : "" });
      navigating = true; // keep showing "Joining meeting..." until the meeting page loads
      router.push(`/meeting/${meetingId}${shareScreen ? "?share=1" : ""}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) setNameError(error.message);
      else setFormError(errorMessage(error));
    } finally {
      if (!navigating) setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError message={formError} />
      <Field label="Meeting ID or invite link" htmlFor="join-meeting-id" error={idError}>
        <TextInput
          id="join-meeting-id"
          autoFocus={!initialMeetingId}
          inputMode="text"
          autoComplete="off"
          placeholder="e.g. 812 345 6789"
          value={meetingInput}
          invalid={Boolean(idError)}
          onChange={(e) => {
            setMeetingInput(e.target.value);
            setIdError(null);
          }}
        />
      </Field>
      <Field label="Your name" htmlFor="join-name" error={nameError}>
        <TextInput
          id="join-name"
          autoFocus={Boolean(initialMeetingId)}
          maxLength={50}
          autoComplete="name"
          placeholder="Enter your name"
          value={displayName}
          invalid={Boolean(nameError)}
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
            setNameError(null);
          }}
        />
      </Field>
      <div className="space-y-2.5 pt-1">
        <Checkbox id="join-remember" label="Remember my name for future meetings" checked={rememberName} onChange={(e) => setRememberName(e.target.checked)} />
        <Checkbox id="join-muted" label="Mute my microphone" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
        <Checkbox id="join-video-off" label="Turn off my video" checked={videoOff} onChange={(e) => setVideoOff(e.target.checked)} />
      </div>
      <p className="text-[12px] text-muted">By clicking &quot;Join&quot;, you agree to share your name with other participants.</p>
      <div className="flex justify-end gap-2 pt-1 pb-4">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={submitting} loadingText="Joining meeting..." disabled={!meetingInput.trim()}>
          {shareScreen ? "Share Screen" : "Join"}
        </Button>
      </div>
    </form>
  );
}

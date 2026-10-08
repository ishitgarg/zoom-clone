"use client";

import { Mic, UserRound, Video, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Checkbox, Field, TextInput } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { loadPreferences, savePreferences, type Preferences } from "@/lib/preferences";

type Section = "general" | "audio" | "video";
const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "general", label: "General", icon: UserRound },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Mic },
];

/** Per-browser meeting preferences used when joining meetings. */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Settings" className="max-w-[620px]">
      {open && <SettingsForm onClose={onClose} />}
    </Dialog>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  const { user } = useCurrentUser();
  const toast = useToast();
  const [section, setSection] = useState<Section>("general");
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences());
  const update = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));

  const save = () => {
    savePreferences({ ...prefs, displayName: prefs.displayName.trim() });
    toast("Settings saved", "success");
    onClose();
  };

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <nav className="flex gap-1 sm:w-40 sm:flex-col" aria-label="Settings sections">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium",
              section === id ? "bg-brand-soft text-brand" : "text-ink-2 hover:bg-hover",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="min-h-[180px] flex-1 space-y-4">
        {section === "general" && (
          <Field
            label="Default display name in meetings"
            htmlFor="pref-name"
            hint={`Leave empty to use your profile name${user ? ` (${user.name})` : ""}.`}
          >
            <TextInput
              id="pref-name"
              maxLength={50}
              value={prefs.displayName}
              placeholder={user?.name ?? "Your name"}
              onChange={(e) => update({ displayName: e.target.value })}
            />
          </Field>
        )}
        {section === "video" && (
          <Checkbox
            id="pref-video"
            label="Turn off my video when joining a meeting"
            checked={prefs.joinWithVideoOff}
            onChange={(e) => update({ joinWithVideoOff: e.target.checked })}
          />
        )}
        {section === "audio" && (
          <Checkbox
            id="pref-audio"
            label="Mute my microphone when joining a meeting"
            checked={prefs.joinWithMicMuted}
            onChange={(e) => update({ joinWithMicMuted: e.target.checked })}
          />
        )}
        <div className="flex justify-end gap-2 pt-6 pb-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ChevronDown, Video } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { ActionTile } from "@/components/dashboard/ActionTile";
import { Checkbox } from "@/components/ui/FormField";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { loadPreferences, savePreferences } from "@/lib/preferences";

/** Orange "New meeting" tile with Zoom's small dropdown for "Start with video". */
export function NewMeetingTile({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [startWithVideo, setStartWithVideo] = useState(() => !loadPreferences().joinWithVideoOff);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <ActionTile icon={Video} label="New meeting" tone="orange" onClick={onStart} loading={loading} loadingLabel="Creating..." hideLabel />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="New meeting options"
        className="mt-2.5 flex items-center gap-0.5 rounded-md px-1 text-[12px] whitespace-nowrap text-ink hover:bg-hover sm:gap-1 sm:text-[15px]"
      >
        {loading ? "Creating..." : "New meeting"}
        <ChevronDown className="size-3.5 text-muted sm:size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute top-full left-1/2 z-20 mt-2 w-56 -translate-x-1/2 animate-pop-in rounded-xl border border-line bg-white p-3 shadow-pop">
          <Checkbox
            id="start-with-video"
            label="Start with video"
            checked={startWithVideo}
            onChange={(e) => {
              setStartWithVideo(e.target.checked);
              savePreferences({ joinWithVideoOff: !e.target.checked });
            }}
          />
        </div>
      )}
    </div>
  );
}

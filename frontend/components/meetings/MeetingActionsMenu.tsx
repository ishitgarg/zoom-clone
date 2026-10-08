"use client";

import { Copy, Link2, MoreHorizontal, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import type { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import type { Meeting } from "@/types/api";

type Actions = ReturnType<typeof useMeetingActions>;

/** "..." menu with Copy invitation / Copy link / Delete for a meeting. */
export function MeetingActionsMenu({ meeting, actions, className }: { meeting: Meeting; actions: Actions; className?: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close, open);

  const canDelete = actions.isHost(meeting) && meeting.status === "scheduled";
  const run = (action: () => void) => {
    close();
    action();
  };
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-hover";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={`More options for ${meeting.title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink"
      >
        <MoreHorizontal className="size-[18px]" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-52 animate-pop-in rounded-xl border border-line bg-white p-1.5 shadow-pop">
          <button role="menuitem" type="button" className={item} onClick={() => run(() => actions.copyInvitation(meeting))}>
            <Copy className="size-4 text-muted" /> Copy invitation
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => run(() => actions.copyLink(meeting))}>
            <Link2 className="size-4 text-muted" /> Copy invite link
          </button>
          {canDelete && (
            <button
              role="menuitem"
              type="button"
              className={cn(item, "text-danger hover:bg-danger/5")}
              onClick={() => run(() => setConfirming(true))}
            >
              <Trash2 className="size-4" /> Delete meeting
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title="Delete meeting?"
        confirmLabel="Delete"
        onConfirm={() => actions.cancelMeeting(meeting)}
        onClose={() => setConfirming(false)}
      >
        <strong className="text-ink">{meeting.title}</strong> will be removed from your upcoming meetings and its link
        will stop working.
      </ConfirmDialog>
    </div>
  );
}

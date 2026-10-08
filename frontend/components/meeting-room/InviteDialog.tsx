"use client";

import { Copy, Link2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextInput } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { copyToClipboard } from "@/lib/clipboard";
import { buildInvitationText, formatMeetingId } from "@/lib/format";
import type { Meeting } from "@/types/api";

export function InviteDialog({ meeting, open, onClose }: { meeting: Meeting; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const copy = async (text: string, what: string) => {
    const ok = await copyToClipboard(text);
    toast(ok ? `${what} copied` : "Couldn't copy to clipboard", ok ? "success" : "error");
  };
  return (
    <Dialog open={open} onClose={onClose} title={`Invite people to join "${meeting.title}"`}>
      <div className="space-y-4 pb-5">
        <p className="text-sm text-ink-2">Share this link. Anyone with it can join using their name.</p>
        <div className="flex gap-2">
          <TextInput readOnly value={meeting.invite_url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
          <Button onClick={() => copy(meeting.invite_url, "Invite link")} aria-label="Copy invite link">
            <Link2 className="size-4" /> Copy
          </Button>
        </div>
        <p className="text-sm text-ink-2">
          Meeting ID: <span className="font-semibold">{formatMeetingId(meeting.meeting_id)}</span>
        </p>
        <Button variant="secondary" onClick={() => copy(buildInvitationText(meeting, meeting.host.name), "Invitation")}>
          <Copy className="size-4" /> Copy invitation
        </Button>
      </div>
    </Dialog>
  );
}

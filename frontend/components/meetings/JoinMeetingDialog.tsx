"use client";

import { JoinMeetingForm } from "@/components/meetings/JoinMeetingForm";
import { Dialog } from "@/components/ui/Dialog";

/** "Join" and "Share screen" tiles: both join a meeting by ID or link. */
export function JoinMeetingDialog({ open, onClose, shareScreen = false }: { open: boolean; onClose: () => void; shareScreen?: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title={shareScreen ? "Share screen" : "Join meeting"}>
      {shareScreen && (
        <p className="mb-4 text-sm text-muted">Enter the meeting ID or invite link of the meeting you want to share your screen in.</p>
      )}
      {/* Mounted only while open so the form resets each time. */}
      {open && <JoinMeetingForm onCancel={onClose} shareScreen={shareScreen} />}
    </Dialog>
  );
}

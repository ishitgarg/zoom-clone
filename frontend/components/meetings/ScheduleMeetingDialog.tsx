"use client";

import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { MeetingInvitation } from "@/components/meetings/MeetingInvitation";
import { ScheduleMeetingForm } from "@/components/meetings/ScheduleMeetingForm";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import type { Meeting } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onScheduled: () => void;
  actions: ReturnType<typeof useMeetingActions>;
}

/** Two steps: the schedule form, then a confirmation showing the generated meeting link. */
export function ScheduleMeetingDialog({ open, onClose, onScheduled, actions }: Props) {
  const [scheduled, setScheduled] = useState<Meeting | null>(null);

  const close = () => {
    setScheduled(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} title={scheduled ? "Meeting scheduled" : "Schedule meeting"} className="max-w-[520px]">
      {open &&
        (scheduled ? (
          <div className="space-y-4 pb-5">
            <p className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" /> Your meeting has been added to Upcoming meetings.
            </p>
            <MeetingInvitation meeting={scheduled} actions={actions} />
            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <ScheduleMeetingForm
            onCancel={close}
            onScheduled={(meeting) => {
              setScheduled(meeting);
              onScheduled();
            }}
          />
        ))}
    </Dialog>
  );
}

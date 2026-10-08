"use client";

import { CalendarDays, Clock, Copy, Hash, Link2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatDuration, formatLongDate, formatMeetingId, formatTime, meetingTimeRange } from "@/lib/format";
import type { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import type { Meeting } from "@/types/api";

/** Summary of a meeting with its ID and invite link, plus copy buttons. */
export function MeetingInvitation({ meeting, actions }: { meeting: Meeting; actions: ReturnType<typeof useMeetingActions> }) {
  const range = meetingTimeRange(meeting);
  const row = "flex items-start gap-3 text-sm";
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-line p-4">
        <p className="text-[15px] font-bold">{meeting.title}</p>
        {meeting.description && <p className="text-[13px] whitespace-pre-line text-ink-2">{meeting.description}</p>}
        {range && meeting.scheduled_start && (
          <>
            <p className={row}>
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted" /> {formatLongDate(range.start)}
            </p>
            <p className={row}>
              <Clock className="mt-0.5 size-4 shrink-0 text-muted" />
              {formatTime(range.start)} – {formatTime(range.end)} ({formatDuration(meeting.duration_minutes)})
            </p>
          </>
        )}
        <p className={row}>
          <Hash className="mt-0.5 size-4 shrink-0 text-muted" /> Meeting ID: {formatMeetingId(meeting.meeting_id)}
        </p>
        <p className={row}>
          <Link2 className="mt-0.5 size-4 shrink-0 text-muted" />
          <a href={meeting.invite_url} className="break-all text-brand hover:underline">
            {meeting.invite_url}
          </a>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => actions.copyInvitation(meeting)}>
          <Copy className="size-3.5" /> Copy invitation
        </Button>
        <Button variant="secondary" size="sm" onClick={() => actions.copyLink(meeting)}>
          <Link2 className="size-3.5" /> Copy link
        </Button>
      </div>
    </div>
  );
}

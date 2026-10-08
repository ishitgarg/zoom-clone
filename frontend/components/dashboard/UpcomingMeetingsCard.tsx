"use client";

import { Plus } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EmptyCalendarIllustration } from "@/components/dashboard/EmptyIllustration";
import { MeetingActionsMenu } from "@/components/meetings/MeetingActionsMenu";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { formatMeetingId, formatRelativeDay, formatTime, meetingTimeRange } from "@/lib/format";
import type { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import { useNow } from "@/lib/hooks/useNow";
import type { Meeting } from "@/types/api";

interface Props {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSchedule: () => void;
  actions: ReturnType<typeof useMeetingActions>;
}

/** Zoom's home calendar card: upcoming meetings grouped by day. */
export function UpcomingMeetingsCard({ meetings, loading, error, onRetry, onSchedule, actions }: Props) {
  const now = useNow(60_000);

  const groups = new Map<string, Meeting[]>();
  for (const meeting of meetings) {
    const range = meetingTimeRange(meeting);
    const label = range && now ? formatRelativeDay(range.start, now) : "";
    groups.set(label, [...(groups.get(label) ?? []), meeting]);
  }

  return (
    <DashboardCard
      id="upcoming-heading"
      title="Upcoming meetings"
      footerHref="/meetings"
      footerLabel="Open Meetings"
      headerAction={
        <button
          type="button"
          onClick={onSchedule}
          aria-label="Schedule a meeting"
          title="Schedule a meeting"
          className="grid size-9 place-items-center rounded-lg text-ink-2 hover:bg-hover"
        >
          <Plus className="size-5" />
        </button>
      }
    >
      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <UpcomingSkeleton />
        ) : error ? (
          <StatusMessage
            tone="error"
            title="Couldn't load meetings"
            description={error}
            action={<Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
          />
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <EmptyCalendarIllustration />
            <p className="mt-3 text-[15px] text-ink-2">No meetings scheduled.</p>
            <button type="button" onClick={onSchedule} className="mt-1 flex items-center gap-1 text-[15px] text-brand hover:underline">
              <Plus className="size-4" /> Schedule a meeting
            </button>
          </div>
        ) : (
          [...groups.entries()].map(([day, items]) => (
            <div key={day} className="mb-1">
              <p className="px-3 pt-2 pb-1 text-[12px] font-semibold tracking-wide text-muted uppercase">{day}</p>
              <ul>
                {items.map((meeting) => (
                  <UpcomingItem key={meeting.meeting_id} meeting={meeting} actions={actions} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </DashboardCard>
  );
}

function UpcomingItem({ meeting, actions }: { meeting: Meeting; actions: Props["actions"] }) {
  const range = meetingTimeRange(meeting);
  const live = meeting.status === "live";
  return (
    <li className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-canvas">
      <div className="w-[76px] shrink-0 text-[13px] leading-tight" suppressHydrationWarning>
        <p className="font-semibold text-ink">{range ? formatTime(range.start) : ""}</p>
        <p className="text-muted">{range ? formatTime(range.end) : ""}</p>
      </div>
      <span className={live ? "h-10 w-[3px] rounded-full bg-success" : "h-10 w-[3px] rounded-full bg-brand"} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold" title={meeting.title}>
          {meeting.title}
        </p>
        <p className="truncate text-[12px] text-muted">
          {live && <span className="mr-1.5 font-semibold text-success">● In progress</span>}
          Meeting ID: {formatMeetingId(meeting.meeting_id)}
        </p>
      </div>
      <Button size="sm" variant={live ? "primary" : "secondary"} onClick={() => actions.openMeeting(meeting)}>
        {actions.isHost(meeting) ? "Start" : "Join"}
      </Button>
      <MeetingActionsMenu meeting={meeting} actions={actions} />
    </li>
  );
}

function UpcomingSkeleton() {
  return (
    <div className="space-y-4 p-3" aria-label="Loading upcoming meetings">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-16" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-14 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

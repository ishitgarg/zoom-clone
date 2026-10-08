"use client";

import { Plus } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EmptyCalendarIllustration } from "@/components/dashboard/EmptyIllustration";
import { MeetingCard } from "@/components/dashboard/MeetingCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMessage } from "@/components/ui/StatusMessage";
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
  const now = useNow(30_000);

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
          <ul className="space-y-3 p-2">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.meeting_id} meeting={meeting} variant="upcoming" now={now} actions={actions} />
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
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

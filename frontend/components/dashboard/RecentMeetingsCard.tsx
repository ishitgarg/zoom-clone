"use client";

import { History, Video } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { MeetingActionsMenu } from "@/components/meetings/MeetingActionsMenu";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { formatDuration, formatMeetingId, formatRelativeDay, formatTime } from "@/lib/format";
import type { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import { useNow } from "@/lib/hooks/useNow";
import type { Meeting } from "@/types/api";

interface Props {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  actions: ReturnType<typeof useMeetingActions>;
}

export function RecentMeetingsCard({ meetings, loading, error, onRetry, actions }: Props) {
  return (
    <DashboardCard id="recent-heading" title="Recent meetings" footerHref="/meetings?tab=previous" footerLabel="View previous meetings">
      {loading ? (
        <div className="space-y-3 p-2" aria-label="Loading recent meetings">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <StatusMessage
          tone="error"
          title="Couldn't load recent meetings"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
        />
      ) : meetings.length === 0 ? (
        <StatusMessage icon={History} title="No recent meetings" description="Meetings you host or join will appear here." />
      ) : (
        <ul className="divide-y divide-line/70">
          {meetings.map((meeting) => (
            <RecentItem key={meeting.meeting_id} meeting={meeting} actions={actions} />
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

function RecentItem({ meeting, actions }: { meeting: Meeting; actions: Props["actions"] }) {
  const now = useNow(60_000);
  const started = meeting.started_at ? new Date(meeting.started_at) : null;
  const live = meeting.status === "live";
  const minutes =
    started && meeting.ended_at ? Math.max(1, Math.round((new Date(meeting.ended_at).getTime() - started.getTime()) / 60_000)) : null;
  const hostIsMe = actions.isHost(meeting);

  return (
    <li className="flex items-center gap-3 px-2 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        <Video className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={meeting.title}>
          {meeting.title}
        </p>
        <p className="truncate text-[12px] text-muted" suppressHydrationWarning>
          {started && now ? `${formatRelativeDay(started, now)}, ${formatTime(started)}` : ""}
          {minutes ? ` · ${formatDuration(minutes)}` : ""}
          {` · ID ${formatMeetingId(meeting.meeting_id)}`}
          {!hostIsMe && ` · Host: ${meeting.host.name}`}
        </p>
      </div>
      {live ? (
        <span className="hidden rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success sm:inline">
          In progress · {meeting.active_participant_count}
        </span>
      ) : (
        <span className="hidden rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-muted sm:inline">Ended</span>
      )}
      <Button size="sm" variant="secondary" onClick={() => actions.openMeeting(meeting)}>
        {live ? "Rejoin" : hostIsMe ? "Start" : "Join"}
      </Button>
      <MeetingActionsMenu meeting={meeting} actions={actions} />
    </li>
  );
}

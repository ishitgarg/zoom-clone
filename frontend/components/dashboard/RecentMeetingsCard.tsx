"use client";

import { History } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/DashboardCard";
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
  actions: ReturnType<typeof useMeetingActions>;
}

export function RecentMeetingsCard({ meetings, loading, error, onRetry, actions }: Props) {
  const now = useNow(60_000);
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
        <ul className="space-y-3 p-2">
          {meetings.map((meeting) => (
            <MeetingCard key={meeting.meeting_id} meeting={meeting} variant="past" now={now} actions={actions} />
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

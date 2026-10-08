"use client";

import { CalendarPlus, CalendarX2, History, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { MeetingActionsMenu } from "@/components/meetings/MeetingActionsMenu";
import { MeetingInvitation } from "@/components/meetings/MeetingInvitation";
import { ScheduleMeetingDialog } from "@/components/meetings/ScheduleMeetingDialog";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { cn } from "@/lib/cn";
import { formatRelativeDay, formatTime, meetingTimeRange } from "@/lib/format";
import { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import { useMeetingLists } from "@/lib/hooks/useMeetingLists";
import { useNow } from "@/lib/hooks/useNow";
import type { Meeting } from "@/types/api";

type Tab = "upcoming" | "previous";

/** "Meetings" tab: list on the left, selected meeting's details on the right (Zoom desktop layout). */
export function MeetingsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { upcoming, recent, reload, retry } = useMeetingLists();
  const actions = useMeetingActions(reload);
  const now = useNow(60_000);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const tab: Tab = searchParams.get("tab") === "previous" ? "previous" : "upcoming";
  const list = tab === "upcoming" ? upcoming : recent;
  const selectedId = searchParams.get("id");
  const selected = list.data.find((m) => m.meeting_id === selectedId) ?? list.data[0] ?? null;

  const navigate = (nextTab: Tab, id?: string) => {
    const query = new URLSearchParams({ tab: nextTab, ...(id ? { id } : {}) });
    router.replace(`/meetings?${query}`, { scroll: false });
  };

  return (
    <main className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-6 md:grid-cols-[340px_minmax(0,1fr)] lg:py-8">
      <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card md:max-h-[calc(100dvh-130px)]">
        <div className="flex items-center justify-between px-4 pt-4">
          <h1 className="text-lg font-bold">Meetings</h1>
          <Button size="sm" variant="ghost" aria-label="Schedule a meeting" onClick={() => setScheduleOpen(true)}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div role="tablist" className="mx-4 mt-3 grid grid-cols-2 rounded-lg bg-canvas p-1">
          {(["upcoming", "previous"] as const).map((value) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={tab === value}
              onClick={() => navigate(value)}
              className={cn(
                "h-8 rounded-md text-[13px] font-semibold capitalize transition-colors",
                tab === value ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.loading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : list.error ? (
            <StatusMessage tone="error" title="Couldn't load meetings" description={list.error} action={<Button size="sm" variant="secondary" onClick={retry}>Try again</Button>} />
          ) : list.data.length === 0 ? (
            <StatusMessage
              icon={tab === "upcoming" ? CalendarX2 : History}
              title={tab === "upcoming" ? "No upcoming meetings" : "No previous meetings"}
              action={tab === "upcoming" ? <Button size="sm" onClick={() => setScheduleOpen(true)}>Schedule a meeting</Button> : undefined}
            />
          ) : (
            <ul>
              {list.data.map((meeting) => (
                <MeetingRow
                  key={meeting.meeting_id}
                  meeting={meeting}
                  now={now}
                  selected={selected?.meeting_id === meeting.meeting_id}
                  onSelect={() => navigate(tab, meeting.meeting_id)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        {selected ? (
          <MeetingDetail meeting={selected} actions={actions} />
        ) : (
          <StatusMessage
            icon={CalendarPlus}
            title="Select a meeting"
            description="Pick a meeting from the list to see its details, or schedule a new one."
            action={<Button onClick={() => setScheduleOpen(true)}>Schedule a meeting</Button>}
            className="py-16"
          />
        )}
      </section>

      <ScheduleMeetingDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} onScheduled={reload} actions={actions} />
    </main>
  );
}

function MeetingRow({ meeting, now, selected, onSelect }: { meeting: Meeting; now: Date | null; selected: boolean; onSelect: () => void }) {
  const range = meetingTimeRange(meeting);
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected || undefined}
        className={cn("w-full rounded-xl px-3 py-2.5 text-left transition-colors", selected ? "bg-brand-soft" : "hover:bg-canvas")}
      >
        <p className="text-[12px] text-muted" suppressHydrationWarning>
          {range && now ? `${formatRelativeDay(range.start, now)} · ${formatTime(range.start)}` : ""}
        </p>
        <p className={cn("truncate text-sm font-semibold", selected && "text-brand")}>{meeting.title}</p>
      </button>
    </li>
  );
}

function MeetingDetail({ meeting, actions }: { meeting: Meeting; actions: ReturnType<typeof useMeetingActions> }) {
  const isHost = actions.isHost(meeting);
  const live = meeting.status === "live";
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            {meeting.meeting_type === "scheduled" ? "Scheduled meeting" : "Instant meeting"}
            <StatusBadge status={meeting.status} />
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{meeting.title}</h2>
          <p className="mt-1 text-sm text-muted">Host: {meeting.host.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => actions.openMeeting(meeting)}>{live ? "Join" : isHost ? "Start" : "Join"}</Button>
          <MeetingActionsMenu meeting={meeting} actions={actions} />
        </div>
      </div>
      <MeetingInvitation meeting={meeting} actions={actions} />
    </div>
  );
}

const STATUS_STYLES: Record<Meeting["status"], { label: string; className: string }> = {
  scheduled: { label: "Upcoming", className: "bg-brand-soft text-brand" },
  live: { label: "In progress", className: "bg-success/10 text-success" },
  ended: { label: "Ended", className: "bg-canvas text-muted" },
  cancelled: { label: "Cancelled", className: "bg-danger/10 text-danger" },
};

function StatusBadge({ status }: { status: Meeting["status"] }) {
  const style = STATUS_STYLES[status];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", style.className)}>{style.label}</span>;
}

"use client";

import { CalendarDays, MonitorUp, Plus } from "lucide-react";
import { useState } from "react";

import { ActionTile } from "@/components/dashboard/ActionTile";
import { NewMeetingTile } from "@/components/dashboard/NewMeetingTile";
import { RecentMeetingsCard } from "@/components/dashboard/RecentMeetingsCard";
import { UpcomingMeetingsCard } from "@/components/dashboard/UpcomingMeetingsCard";
import { JoinMeetingDialog } from "@/components/meetings/JoinMeetingDialog";
import { ScheduleMeetingDialog } from "@/components/meetings/ScheduleMeetingDialog";
import { formatTime } from "@/lib/format";
import { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import { useMeetingLists } from "@/lib/hooks/useMeetingLists";
import { useNow } from "@/lib/hooks/useNow";

const fullDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

/** Home screen laid out like Zoom Workplace: clock, action tiles, then the meetings cards. */
export function Dashboard() {
  const { upcoming, recent, reload, retry } = useMeetingLists();
  const actions = useMeetingActions(reload);
  const now = useNow(1000);
  const [joinOpen, setJoinOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pt-8 pb-10 sm:px-6 sm:pt-12">
      <div className="text-center" suppressHydrationWarning>
        <p className="text-[40px] leading-tight font-bold tracking-tight text-ink tabular-nums sm:text-[48px]">
          {now ? formatTime(now) : " "}
        </p>
        <p className="mt-1 text-[16px] text-muted sm:text-[18px]">{now ? fullDate.format(now) : " "}</p>
      </div>

      <section aria-label="Meeting actions" className="mt-8 grid grid-cols-4 justify-items-center gap-2 sm:mt-10 sm:flex sm:justify-center sm:gap-14">
        <NewMeetingTile onStart={actions.createInstantMeeting} loading={actions.creating} />
        <ActionTile icon={Plus} label="Join" onClick={() => setJoinOpen(true)} />
        <ActionTile icon={CalendarDays} label="Schedule" onClick={() => setScheduleOpen(true)} />
        <ActionTile icon={MonitorUp} label="Share screen" onClick={() => setShareOpen(true)} />
      </section>
      {actions.creating && (
        <p role="status" className="mt-4 text-center text-[13px] text-muted">
          Creating meeting...
        </p>
      )}

      <div className="mt-10 space-y-6">
        <UpcomingMeetingsCard
          {...upcoming}
          meetings={upcoming.data}
          onRetry={retry}
          onSchedule={() => setScheduleOpen(true)}
          actions={actions}
        />
        <RecentMeetingsCard {...recent} meetings={recent.data} onRetry={retry} actions={actions} />
      </div>

      <JoinMeetingDialog open={joinOpen} onClose={() => setJoinOpen(false)} />
      <JoinMeetingDialog open={shareOpen} onClose={() => setShareOpen(false)} shareScreen />
      <ScheduleMeetingDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} onScheduled={reload} actions={actions} />
    </main>
  );
}

"use client";

import { Video } from "lucide-react";

import { MeetingActionsMenu } from "@/components/meetings/MeetingActionsMenu";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatRelativeDay, formatTime, meetingTimeRange } from "@/lib/format";
import type { useMeetingActions } from "@/lib/hooks/useMeetingActions";
import type { Meeting } from "@/types/api";

const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const SOON_MINUTES = 60;

/** "Today, Oct 9" / "Tomorrow, Oct 10" / "Sun, Oct 11" — Zoom's calendar card wording. */
function dayLabel(date: Date, now: Date): string {
  const relative = formatRelativeDay(date, now);
  return ["Today", "Tomorrow", "Yesterday"].includes(relative) ? `${relative}, ${monthDay.format(date)}` : relative;
}

/** "2:30 – 3:00 AM" (one AM/PM when both times share it, like Zoom). */
function timeRangeLabel(start: Date, end: Date): string {
  const startText = formatTime(start);
  const endText = formatTime(end);
  const suffix = (text: string) => text.match(/\s?(AM|PM|am|pm)$/)?.[0] ?? "";
  const startSuffix = suffix(startText);
  if (startSuffix && startSuffix === suffix(endText)) return `${startText.slice(0, -startSuffix.length)} - ${endText}`;
  return `${startText} - ${endText}`;
}

/**
 * A meeting in Zoom's home calendar style. "upcoming" cards are blue with a Start/Join
 * button; "past" cards are grey, like meetings that already happened in Zoom.
 */
export function MeetingCard({
  meeting,
  variant,
  now,
  actions,
}: {
  meeting: Meeting;
  variant: "upcoming" | "past";
  now: Date | null;
  actions: ReturnType<typeof useMeetingActions>;
}) {
  const range = meetingTimeRange(meeting);
  const live = meeting.status === "live";
  const isHost = actions.isHost(meeting);
  const minutesUntil = range && now ? Math.ceil((range.start.getTime() - now.getTime()) / 60_000) : null;

  let status: { text: string; className: string } | null = null;
  if (live) status = { text: "In progress", className: "font-bold text-success" };
  else if (variant === "upcoming" && minutesUntil !== null && minutesUntil > 0 && minutesUntil <= SOON_MINUTES) {
    status = { text: `In ${minutesUntil} min`, className: "font-bold text-[#c4122f]" };
  } else if (variant === "upcoming" && minutesUntil !== null && minutesUntil <= 0) {
    status = { text: "Starting now", className: "font-bold text-[#c4122f]" };
  } else if (range && now) {
    status = { text: dayLabel(range.start, now), className: "text-ink-2" };
  }

  return (
    <li
      className={cn(
        "rounded-xl border px-4 py-3",
        variant === "upcoming" ? "border-[#b9cdfb] bg-[#f0f5ff]" : "border-line bg-[#f8f9fb]",
      )}
    >
      <p className="flex items-center gap-2 text-[16px] font-semibold text-ink">
        {variant === "past" && <Video className="size-4 shrink-0 text-ink-2" aria-hidden />}
        <span className="truncate" title={meeting.title}>
          {meeting.title}
        </span>
      </p>
      <div className="mt-0.5 space-y-0.5 text-[14px] text-ink-2" suppressHydrationWarning>
        {status && <p className={cn("text-[13px]", status.className)}>{status.text}</p>}
        {range && <p>{timeRangeLabel(range.start, range.end)}</p>}
        <p>Host: {meeting.host.name}</p>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {variant === "upcoming" || live ? (
          <Button size="sm" className="rounded-full! px-4" onClick={() => actions.openMeeting(meeting)}>
            {live ? "Join" : isHost ? "Start" : "Join"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full! px-4"
            onClick={() => actions.openMeeting(meeting)}
          >
            {isHost ? "Start again" : "Join again"}
          </Button>
        )}
        <MeetingActionsMenu meeting={meeting} actions={actions} />
      </div>
    </li>
  );
}

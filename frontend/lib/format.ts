import type { Meeting } from "@/types/api";

/** "8123456789" -> "812 345 6789" (Zoom's grouping). */
export function formatMeetingId(id: string): string {
  if (id.length === 10) return `${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6)}`;
  if (id.length === 11) return `${id.slice(0, 3)} ${id.slice(3, 7)} ${id.slice(7)}`;
  return id.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/** Accepts "812 345 6789", "812-345-6789" or an invite link; returns digits or null. */
export function parseMeetingInput(raw: string): string | null {
  const trimmed = raw.trim();
  const fromLink = trimmed.match(/\/meeting\/([\d\s-]+)/);
  const digits = (fromLink ? fromLink[1] : trimmed).replace(/[\s-]/g, "");
  return /^\d{9,11}$/.test(digits) ? digits : null;
}

/** First letter of the name, shown in avatar circles (like Zoom). */
export function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const longDayFormat = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });

export const formatTime = (date: Date) => timeFormat.format(date);
export const formatLongDate = (date: Date) => longDayFormat.format(date);

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today", "Tomorrow", "Yesterday" or "Mon, Oct 12". */
export function formatRelativeDay(date: Date, now = new Date()): string {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return dayFormat.format(date);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} hr ${m} min`;
  if (h) return `${h} hr`;
  return `${m} min`;
}

export function meetingTimeRange(meeting: Meeting): { start: Date; end: Date } | null {
  const startIso = meeting.scheduled_start ?? meeting.started_at;
  if (!startIso) return null;
  const start = new Date(startIso);
  const end = meeting.ended_at && !meeting.scheduled_start
    ? new Date(meeting.ended_at)
    : new Date(start.getTime() + meeting.duration_minutes * 60_000);
  return { start, end };
}

export function buildInvitationText(meeting: Meeting, hostName: string): string {
  const lines = [`${hostName} is inviting you to a scheduled meeting.`, "", `Topic: ${meeting.title}`];
  const range = meetingTimeRange(meeting);
  if (meeting.scheduled_start && range) {
    lines.push(`Time: ${formatLongDate(range.start)}, ${formatTime(range.start)} (${formatDuration(meeting.duration_minutes)})`);
  }
  lines.push("", "Join Meeting", meeting.invite_url, "", `Meeting ID: ${formatMeetingId(meeting.meeting_id)}`);
  return lines.join("\n");
}

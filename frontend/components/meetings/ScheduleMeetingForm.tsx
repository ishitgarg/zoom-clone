"use client";

import { Globe2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, TextArea, TextInput } from "@/components/ui/FormField";
import { errorMessage } from "@/lib/api/client";
import { meetingsApi } from "@/lib/api/meetings";
import type { Meeting } from "@/types/api";

const MINUTES_IN_DAY = 24 * 60;
const TIME_STEP_MINUTES = 15;
const MIN_DURATION = 15;
const DURATION_HOURS = Array.from({ length: 25 }, (_, h) => h);
const DURATION_MINUTES = [0, 15, 30, 45];

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInputValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Next half hour from now, like Zoom's default start time. */
function defaultStart(): { date: string; minutes: number } {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30)));
  return { date: toDateInputValue(d), minutes: d.getHours() * 60 + d.getMinutes() };
}

const timeLabel = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const TIME_OPTIONS = Array.from({ length: MINUTES_IN_DAY / TIME_STEP_MINUTES }, (_, i) => {
  const minutes = i * TIME_STEP_MINUTES;
  return { value: minutes, label: timeLabel.format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60)) };
});

/** Combine the date input + time-of-day select (both in the user's local time zone). */
function toLocalDate(date: string, minutes: number): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
}

interface Errors {
  title?: string;
  start?: string;
  duration?: string;
}

export function ScheduleMeetingForm({ onCancel, onScheduled }: { onCancel: () => void; onScheduled: (m: Meeting) => void }) {
  const { user } = useCurrentUser();
  const [initial] = useState(defaultStart);
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const [title, setTitle] = useState(user ? `${user.name}'s Zoom Meeting` : "");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(initial.date);
  const [startMinutes, setStartMinutes] = useState(initial.minutes);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): { errors: Errors; start: Date | null; duration: number } => {
    const found: Errors = {};
    const start = toLocalDate(date, startMinutes);
    const duration = hours * 60 + minutes;
    if (!title.trim()) found.title = "Please enter a meeting topic.";
    if (!start) found.start = "Please choose a date.";
    else if (start.getTime() < Date.now() - 60_000) found.start = "Start time must be in the future.";
    if (duration < MIN_DURATION) found.duration = "Duration must be at least 15 minutes.";
    else if (duration > MINUTES_IN_DAY) found.duration = "Duration can be at most 24 hours.";
    return { errors: found, start, duration };
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const { errors: found, start, duration } = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !start) return;

    setSubmitting(true);
    try {
      const meeting = await meetingsApi.schedule({
        title: title.trim(),
        description: description.trim() || null,
        start_time: start.toISOString(),
        duration_minutes: duration,
      });
      onScheduled(meeting);
    } catch (error) {
      setFormError(errorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <FormError message={formError} />
      <Field label="Topic" htmlFor="schedule-title" error={errors.title}>
        <TextInput
          id="schedule-title"
          autoFocus
          maxLength={200}
          value={title}
          invalid={Boolean(errors.title)}
          placeholder="My meeting"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Description (optional)" htmlFor="schedule-description">
        <TextArea
          id="schedule-description"
          maxLength={2000}
          value={description}
          placeholder="Add an agenda or notes for attendees"
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_150px]">
        <Field label="Date" htmlFor="schedule-date" error={errors.start}>
          <TextInput
            id="schedule-date"
            type="date"
            min={toDateInputValue(new Date())}
            value={date}
            invalid={Boolean(errors.start)}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Time" htmlFor="schedule-time">
          <Select id="schedule-time" value={startMinutes} onChange={(e) => setStartMinutes(Number(e.target.value))}>
            {TIME_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Duration" htmlFor="schedule-hours" error={errors.duration}>
        <div className="flex items-center gap-2">
          <Select id="schedule-hours" aria-label="Hours" className="w-24" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {DURATION_HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
          <span className="text-sm text-muted">hr</span>
          <Select aria-label="Minutes" className="w-24" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {DURATION_MINUTES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          <span className="text-sm text-muted">min</span>
        </div>
      </Field>

      <div className="space-y-1.5 rounded-xl bg-canvas px-3.5 py-3 text-[13px] text-ink-2">
        <p className="flex items-center gap-2">
          <Globe2 className="size-4 text-muted" /> Time zone: <span className="font-medium">{timeZone}</span>
        </p>
        <p className="text-muted">A unique meeting ID and invite link will be generated automatically.</p>
      </div>

      <div className="flex justify-end gap-2 pt-1 pb-4">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} loadingText="Scheduling meeting...">
          Save
        </Button>
      </div>
    </form>
  );
}

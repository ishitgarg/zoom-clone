import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-subtle transition-colors hover:border-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 aria-[invalid=true]:border-danger disabled:bg-canvas";

export function Field({ label, htmlFor, error, hint, children }: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[12px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      aria-describedby={invalid && props.id ? `${props.id}-error` : undefined}
      className={cn(control, "h-10", className)}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-[76px] resize-y py-2", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "h-10 cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, id, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-2 select-none">
      <input id={id} type="checkbox" className="size-4 cursor-pointer rounded accent-brand" {...props} />
      {label}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-[13px] text-danger">
      {message}
    </div>
  );
}

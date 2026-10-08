"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Prevent closing (e.g. while a request is in flight). */
  dismissible?: boolean;
}

/**
 * Modal built on the native <dialog> element, which gives us focus trapping, Escape-to-close
 * and correct stacking for free.
 */
export function Dialog({ open, onClose, title, children, footer, className, dismissible = true }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        if (event.target === ref.current && dismissible) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-32px)] max-w-[440px] rounded-2xl bg-white p-0 text-ink shadow-pop open:animate-pop-in",
        className,
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-48px)] flex-col">
          <header className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-[17px] font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              disabled={!dismissible}
              aria-label="Close"
              className="-mr-2 grid size-8 place-items-center rounded-lg text-muted hover:bg-hover disabled:opacity-40"
            >
              <X className="size-[18px]" />
            </button>
          </header>
          <div className="overflow-y-auto px-6 pb-2">{children}</div>
          {footer && <footer className="flex justify-end gap-2 px-6 pt-3 pb-5">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

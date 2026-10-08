import { X } from "lucide-react";
import type { ReactNode } from "react";

/** White right-hand panel used for Participants and Chat (full-screen on small devices). */
export function SidePanel({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <aside
      aria-label={title}
      className="fixed inset-0 z-40 flex animate-fade-in flex-col bg-white text-ink md:static md:inset-auto md:z-auto md:w-[340px] md:shrink-0 md:rounded-l-xl md:border-l md:border-room-line"
    >
      <header className="relative flex h-12 shrink-0 items-center justify-center border-b border-line px-4">
        <h2 className="text-sm font-bold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="absolute right-2 grid size-8 place-items-center rounded-lg text-muted hover:bg-hover"
        >
          <X className="size-4" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <footer className="shrink-0 border-t border-line p-3">{footer}</footer>}
    </aside>
  );
}

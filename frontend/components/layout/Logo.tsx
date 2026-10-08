import Link from "next/link";

/** Original product mark (we deliberately don't reuse Zoom's trademarked logo). */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 rounded-lg" aria-label="Zoom Clone home">
      <span className="grid size-8 place-items-center rounded-[10px] bg-brand">
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="white" aria-hidden>
          <rect x="2.5" y="6.5" width="12.5" height="11" rx="3" />
          <path d="M16.5 10.6 21 7.8v8.4l-4.5-2.8z" />
        </svg>
      </span>
      <span className="hidden text-[17px] font-extrabold tracking-tight text-ink sm:inline">
        Zoom<span className="font-semibold text-brand"> Clone</span>
      </span>
    </Link>
  );
}

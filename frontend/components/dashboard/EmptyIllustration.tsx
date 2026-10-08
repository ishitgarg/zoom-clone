/** Small original illustration for "nothing scheduled" (a calendar page with a check mark). */
export function EmptyCalendarIllustration() {
  return (
    <svg viewBox="0 0 120 96" className="h-20 w-24" aria-hidden>
      <ellipse cx="60" cy="86" rx="44" ry="7" fill="#e8ebf7" />
      <rect x="28" y="16" width="64" height="58" rx="10" fill="#ffffff" stroke="#c9d0f5" strokeWidth="2.5" />
      <path d="M28 30a10 10 0 0 1 10-10h44a10 10 0 0 1 10 10v6H28z" fill="#dfe6ff" />
      <rect x="42" y="10" width="5" height="14" rx="2.5" fill="#9fb0f0" />
      <rect x="73" y="10" width="5" height="14" rx="2.5" fill="#9fb0f0" />
      <path d="m48 55 8 8 16-17" fill="none" stroke="#7d93ec" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

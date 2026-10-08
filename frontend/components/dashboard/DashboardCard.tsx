import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Zoom's home calendar card: grey header bar, list body and a link footer. */
export function DashboardCard({
  id,
  title,
  headerAction,
  footerHref,
  footerLabel,
  children,
}: {
  id: string;
  title: string;
  headerAction?: ReactNode;
  footerHref: string;
  footerLabel: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative flex h-14 items-center justify-center border-b border-line bg-canvas px-12">
        {headerAction && <div className="absolute left-3">{headerAction}</div>}
        <h2 id={id} className="text-[16px] font-bold">
          {title}
        </h2>
      </div>
      <div className="px-2 py-2">{children}</div>
      <Link href={footerHref} className="flex items-center gap-1 border-t border-line px-5 py-3.5 text-[15px] text-ink-2 hover:bg-canvas">
        {footerLabel} <ChevronRight className="size-4" />
      </Link>
    </section>
  );
}

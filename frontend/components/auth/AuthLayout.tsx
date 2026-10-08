import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/layout/Logo";

/** Centered card layout shared by the Sign In and Sign Up pages. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-[60px] items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <Logo />
        <Link href="/" className="text-sm font-semibold text-brand hover:underline">
          Continue as demo user
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-[420px] rounded-2xl border border-line bg-white px-6 py-8 shadow-card sm:px-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
          <div className="mt-6 border-t border-line pt-5 text-center text-sm text-muted">{footer}</div>
        </div>
      </main>
    </div>
  );
}

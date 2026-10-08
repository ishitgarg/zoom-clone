"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { JoinMeetingForm } from "@/components/meetings/JoinMeetingForm";

function JoinCard() {
  const searchParams = useSearchParams();
  return (
    <div className="w-full max-w-[440px] rounded-2xl border border-line bg-white px-6 pt-6 shadow-card">
      <h1 className="mb-5 text-xl font-bold">Join meeting</h1>
      <JoinMeetingForm initialMeetingId={searchParams.get("id") ?? ""} />
    </div>
  );
}

/** Standalone join page (/join or /join?id=8123456789). */
export default function JoinPage() {
  return (
    <AppShell>
      <main className="flex items-start justify-center px-4 py-10 sm:py-16">
        <Suspense>
          <JoinCard />
        </Suspense>
      </main>
    </AppShell>
  );
}

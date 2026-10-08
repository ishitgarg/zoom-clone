import { Suspense } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { MeetingsWorkspace } from "@/components/meetings/MeetingsWorkspace";

export default function MeetingsPage() {
  return (
    <AppShell>
      <Suspense>
        <MeetingsWorkspace />
      </Suspense>
    </AppShell>
  );
}

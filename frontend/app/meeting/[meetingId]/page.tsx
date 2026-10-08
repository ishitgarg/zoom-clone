import { Suspense } from "react";

import { MeetingPage } from "@/components/meeting-room/MeetingPage";

export default function Page() {
  // useSearchParams() inside MeetingPage requires a Suspense boundary.
  return (
    <Suspense>
      <MeetingPage />
    </Suspense>
  );
}

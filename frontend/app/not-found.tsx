import { SearchX } from "lucide-react";

import { HomeLink, MeetingStatusScreen } from "@/components/meeting-room/MeetingStatusScreen";

export default function NotFound() {
  return (
    <MeetingStatusScreen
      tone="error"
      icon={SearchX}
      title="Page not found"
      description="The page you're looking for doesn't exist."
      actions={<HomeLink />}
    />
  );
}

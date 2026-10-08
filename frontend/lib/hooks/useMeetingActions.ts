import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useCurrentUser } from "@/components/providers/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { errorMessage } from "@/lib/api/client";
import { meetingsApi } from "@/lib/api/meetings";
import { copyToClipboard } from "@/lib/clipboard";
import { buildInvitationText } from "@/lib/format";
import type { Meeting } from "@/types/api";

/** Actions shared by every place that lists meetings (dashboard, Meetings page, dialogs). */
export function useMeetingActions(onChanged?: () => Promise<void> | void) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useCurrentUser();
  const [creating, setCreating] = useState(false);

  const isHost = useCallback((meeting: Meeting) => user?.id === meeting.host.id, [user]);

  /** Host starts (or re-opens) one of their meetings; anyone else goes to the join screen. */
  const openMeeting = useCallback(
    (meeting: Meeting) => {
      const query = isHost(meeting) ? "?start=1" : "";
      router.push(`/meeting/${meeting.meeting_id}${query}`);
    },
    [isHost, router],
  );

  const createInstantMeeting = useCallback(async () => {
    setCreating(true);
    try {
      const meeting = await meetingsApi.createInstant();
      router.push(`/meeting/${meeting.meeting_id}?start=1`);
    } catch (error) {
      toast(errorMessage(error), "error");
      setCreating(false);
    }
  }, [router, toast]);

  const copyInvitation = useCallback(
    async (meeting: Meeting) => {
      const ok = await copyToClipboard(buildInvitationText(meeting, meeting.host.name));
      toast(ok ? "Meeting invitation copied" : "Couldn't copy to clipboard", ok ? "success" : "error");
    },
    [toast],
  );

  const copyLink = useCallback(
    async (meeting: Meeting) => {
      const ok = await copyToClipboard(meeting.invite_url);
      toast(ok ? "Invite link copied" : "Couldn't copy to clipboard", ok ? "success" : "error");
    },
    [toast],
  );

  const cancelMeeting = useCallback(
    async (meeting: Meeting) => {
      try {
        await meetingsApi.cancel(meeting.meeting_id);
        await onChanged?.();
        toast("Meeting deleted", "success");
      } catch (error) {
        toast(errorMessage(error), "error");
      }
    },
    [onChanged, toast],
  );

  return { isHost, openMeeting, createInstantMeeting, creating, copyInvitation, copyLink, cancelMeeting };
}

import { apiRequest } from "@/lib/api/client";
import type { CurrentUser, Meeting, ScheduleMeetingInput } from "@/types/api";

const path = (meetingId: string) => `/meetings/${encodeURIComponent(meetingId)}`;

export const meetingsApi = {
  getCurrentUser: () => apiRequest<CurrentUser>("/users/me"),
  createInstant: () => apiRequest<Meeting>("/meetings/instant", { method: "POST" }),
  schedule: (input: ScheduleMeetingInput) => apiRequest<Meeting>("/meetings", { method: "POST", body: input }),
  listUpcoming: () => apiRequest<Meeting[]>("/meetings/upcoming"),
  listRecent: () => apiRequest<Meeting[]>("/meetings/recent"),
  get: (meetingId: string) => apiRequest<Meeting>(path(meetingId)),
  cancel: (meetingId: string) => apiRequest<void>(path(meetingId), { method: "DELETE" }),
  endForAll: (meetingId: string, token: string) =>
    apiRequest<void>(`${path(meetingId)}/end`, { method: "POST", participantToken: token }),
};

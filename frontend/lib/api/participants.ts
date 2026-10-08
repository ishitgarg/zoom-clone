import { apiRequest } from "@/lib/api/client";
import type {
  ChatMessage,
  HeartbeatResponse,
  JoinMeetingInput,
  JoinMeetingResponse,
  Participant,
  ParticipantStateUpdate,
  Signal,
  SignalKind,
} from "@/types/api";

const base = (meetingId: string) => `/meetings/${encodeURIComponent(meetingId)}`;

export const participantsApi = {
  join: (meetingId: string, input: JoinMeetingInput) =>
    apiRequest<JoinMeetingResponse>(`${base(meetingId)}/participants`, { method: "POST", body: input }),

  heartbeat: (meetingId: string, token: string) =>
    apiRequest<HeartbeatResponse>(`${base(meetingId)}/participants/me/heartbeat`, {
      method: "POST",
      participantToken: token,
    }),

  updateMe: (meetingId: string, token: string, update: ParticipantStateUpdate) =>
    apiRequest<Participant>(`${base(meetingId)}/participants/me`, {
      method: "PATCH",
      body: update,
      participantToken: token,
    }),

  leave: (meetingId: string, token: string, keepalive = false) =>
    apiRequest<void>(`${base(meetingId)}/participants/me/leave`, {
      method: "POST",
      participantToken: token,
      keepalive,
    }),

  // Host controls
  muteAll: (meetingId: string, token: string) =>
    apiRequest<{ muted: number }>(`${base(meetingId)}/participants/mute-all`, {
      method: "POST",
      participantToken: token,
    }),
  mute: (meetingId: string, token: string, participantId: number) =>
    apiRequest<Participant>(`${base(meetingId)}/participants/${participantId}/mute`, {
      method: "POST",
      participantToken: token,
    }),
  remove: (meetingId: string, token: string, participantId: number) =>
    apiRequest<void>(`${base(meetingId)}/participants/${participantId}`, {
      method: "DELETE",
      participantToken: token,
    }),
};

export const chatApi = {
  list: (meetingId: string, token: string, afterId: number) =>
    apiRequest<ChatMessage[]>(`${base(meetingId)}/messages?after_id=${afterId}`, { participantToken: token }),
  send: (meetingId: string, token: string, body: string) =>
    apiRequest<ChatMessage>(`${base(meetingId)}/messages`, {
      method: "POST",
      body: { body },
      participantToken: token,
    }),
};

export const signalsApi = {
  send: (meetingId: string, token: string, recipientId: number, kind: SignalKind, payload: unknown) =>
    apiRequest<Signal>(`${base(meetingId)}/signals`, {
      method: "POST",
      body: { recipient_id: recipientId, kind, payload: JSON.stringify(payload) },
      participantToken: token,
    }),
  receive: (meetingId: string, token: string, afterId: number) =>
    apiRequest<Signal[]>(`${base(meetingId)}/signals?after_id=${afterId}`, { participantToken: token }),
};

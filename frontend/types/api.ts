// Types mirroring the backend's Pydantic response schemas.

export type MeetingType = "instant" | "scheduled";
export type MeetingStatus = "scheduled" | "live" | "ended" | "cancelled";
export type ParticipantRole = "host" | "attendee";
export type LeaveReason = "left" | "removed" | "timed_out" | "meeting_ended";

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CurrentUser extends User {
  /** False when nobody has signed in and the default demo user is being used. */
  is_authenticated: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_at: string;
}

export interface Meeting {
  meeting_id: string;
  title: string;
  description: string | null;
  meeting_type: MeetingType;
  status: MeetingStatus;
  host: { id: number; name: string };
  scheduled_start: string | null;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  invite_url: string;
  active_participant_count: number;
}

export interface Participant {
  id: number;
  display_name: string;
  role: ParticipantRole;
  is_muted: boolean;
  is_video_on: boolean;
  hand_raised: boolean;
  is_screen_sharing: boolean;
  reaction: string | null;
  reaction_at: string | null;
  joined_at: string;
  left_at: string | null;
  left_reason: LeaveReason | null;
  is_active: boolean;
}

export interface JoinMeetingResponse {
  meeting: Meeting;
  participant: Participant;
  session_token: string;
}

export interface HeartbeatResponse {
  participant: Participant;
  meeting_status: MeetingStatus;
  participants: Participant[];
}

export interface ChatMessage {
  id: number;
  participant_id: number | null;
  sender_name: string;
  body: string;
  created_at: string;
}

export type SignalKind = "offer" | "answer" | "candidate";

export interface Signal {
  id: number;
  sender_id: number;
  kind: SignalKind;
  payload: string;
}

export interface ScheduleMeetingInput {
  title: string;
  description: string | null;
  start_time: string; // ISO-8601 with timezone
  duration_minutes: number;
}

export interface JoinMeetingInput {
  display_name: string;
  as_host?: boolean;
  is_muted?: boolean;
  is_video_on?: boolean;
}

export interface ParticipantStateUpdate {
  is_muted?: boolean;
  is_video_on?: boolean;
  hand_raised?: boolean;
  is_screen_sharing?: boolean;
  reaction?: string;
}

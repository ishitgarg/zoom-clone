// Remembers which participant this browser tab is in a meeting, so refreshing the meeting
// page resumes the same session instead of joining a second time. sessionStorage is per-tab,
// which matches "one tab = one participant".

export interface StoredSession {
  participantId: number;
  token: string;
}

const key = (meetingId: string) => `zoom-clone:session:${meetingId}`;

export function loadSession(meetingId: string): StoredSession | null {
  try {
    const raw = window.sessionStorage.getItem(key(meetingId));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(meetingId: string, session: StoredSession) {
  try {
    window.sessionStorage.setItem(key(meetingId), JSON.stringify(session));
  } catch {
    // Without storage a refresh simply asks the user to join again.
  }
}

export function clearSession(meetingId: string) {
  try {
    window.sessionStorage.removeItem(key(meetingId));
  } catch {
    // ignore
  }
}

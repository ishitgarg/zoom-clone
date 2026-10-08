// Stores the sign-in token in this browser. A bearer token (rather than a cookie) is used
// because the frontend and API are deployed on different domains.

const STORAGE_KEY = "zoom-clone:auth-token";
export const AUTH_CHANGED_EVENT = "zoom-clone:auth-changed";

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the user simply stays on the default account.
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

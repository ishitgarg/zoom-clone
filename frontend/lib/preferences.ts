// Per-browser preferences (the Settings dialog). These are conveniences only, so storage
// failures (private mode, blocked storage) silently fall back to defaults.

export interface Preferences {
  displayName: string;
  joinWithMicMuted: boolean;
  joinWithVideoOff: boolean;
}

const STORAGE_KEY = "zoom-clone:preferences";
export const DEFAULT_PREFERENCES: Preferences = { displayName: "", joinWithMicMuted: false, joinWithVideoOff: false };

export function loadPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(update: Partial<Preferences>): Preferences {
  const next = { ...loadPreferences(), ...update };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

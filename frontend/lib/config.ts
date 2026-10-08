// NEXT_PUBLIC_* variables are inlined at build time.
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const HEARTBEAT_INTERVAL_MS = 2000;
export const CHAT_POLL_INTERVAL_MS = 2000;
export const SIGNAL_POLL_INTERVAL_MS = 1000;
export const REACTION_VISIBLE_MS = 5000;

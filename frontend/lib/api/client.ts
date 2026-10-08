import { getAuthToken, setAuthToken } from "@/lib/auth/token-store";
import { API_BASE_URL } from "@/lib/config";

/** Error thrown for any failed API call; `message` is always safe to show to the user. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound() {
    return this.status === 404;
  }

  /** Status 0 means the request never reached the server. */
  get isNetworkError() {
    return this.status === 0;
  }
}

const NETWORK_ERROR_MESSAGE = "Unable to reach the server. Please check your connection and try again.";

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  participantToken?: string;
  /** Lets a request finish even if the page is being closed (used for "leave"). */
  keepalive?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const authToken = typeof window === "undefined" ? null : getAuthToken();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.participantToken) headers["X-Participant-Token"] = options.participantToken;
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      keepalive: options.keepalive,
      signal: options.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, "network_error");
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (authToken && data?.code === "invalid_auth_token") {
      // The sign-in expired: forget it and retry as the default user.
      setAuthToken(null);
      return apiRequest<T>(path, options);
    }
    const message =
      typeof data?.detail === "string" ? data.detail : "Something went wrong. Please try again.";
    throw new ApiError(message, response.status, data?.code);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

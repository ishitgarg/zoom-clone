import { apiRequest } from "@/lib/api/client";
import type { AuthResponse } from "@/types/api";

export const authApi = {
  signUp: (input: { name: string; email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/signup", { method: "POST", body: input }),
  signIn: (input: { email: string; password: string }) =>
    apiRequest<AuthResponse>("/auth/login", { method: "POST", body: input }),
  signOut: () => apiRequest<void>("/auth/logout", { method: "POST" }),
};

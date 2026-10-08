"use client";

import type { ReactNode } from "react";

import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { ToastProvider } from "@/components/ui/Toast";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CurrentUserProvider>{children}</CurrentUserProvider>
    </ToastProvider>
  );
}

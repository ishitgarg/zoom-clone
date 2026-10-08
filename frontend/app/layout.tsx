import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/providers/AppProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom Clone — Video Meetings",
  description: "Create, join and schedule video meetings.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b5cff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

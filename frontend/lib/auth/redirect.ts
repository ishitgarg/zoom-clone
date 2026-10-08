/** Only allow redirects to paths inside this app (prevents "open redirect" links). */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

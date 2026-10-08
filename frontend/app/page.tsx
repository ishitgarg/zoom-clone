import { Dashboard } from "@/components/dashboard/Dashboard";
import { AppShell } from "@/components/layout/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

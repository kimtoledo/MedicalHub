import AppShell from "@/components/app/AppShell";

/** Full clinic/dentist shell — sidebar + topbar + mobile tabs. */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

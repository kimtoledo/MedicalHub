import { redirect } from "next/navigation";
import AppShell from "@/components/app/AppShell";
import { getClinicSession, getClinicShellContext } from "@/lib/clinic-session";

/** Full clinic/dentist shell — sidebar + topbar + mobile tabs. */
export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  const identity = await getClinicSession();

  if (!identity) {
    redirect("/cl-login");
  }

  const context = await getClinicShellContext(identity);
  return <AppShell identity={identity} context={context}>{children}</AppShell>;
}

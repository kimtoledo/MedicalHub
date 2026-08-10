import ClinicAuthGuard from "@/components/app/ClinicAuthGuard";

/** Auth guard for all /cl-login and /app/* routes. */
export default function ClinicGroupLayout({ children }: { children: React.ReactNode }) {
  return <ClinicAuthGuard>{children}</ClinicAuthGuard>;
}

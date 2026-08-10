import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

/** Wraps all /th-admin/* routes with the mock auth guard. */
export default function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}

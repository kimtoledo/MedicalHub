"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

const LOGIN_PATH = "/th-admin/login";

export default function AdminAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === LOGIN_PATH;

  // Login page renders immediately — no check needed.
  // Protected pages start hidden until localStorage is verified.
  const [checked, setChecked] = useState(isLoginPage);

  useEffect(() => {
    const session = localStorage.getItem("th_admin_session");

    if (!session && !isLoginPage) {
      // Not logged in on a protected page → go to login
      router.replace(LOGIN_PATH);
    } else if (session && isLoginPage) {
      // Already logged in on login page → go to dashboard
      router.replace("/th-admin");
    } else {
      setChecked(true);
    }
  }, [pathname, router, isLoginPage]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

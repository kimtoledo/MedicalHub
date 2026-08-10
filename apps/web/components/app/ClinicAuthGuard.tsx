"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export const LOGIN_PATH = "/cl-login";
export type ClinicRole = "clinic_staff" | "dentist";

export interface ClinicSession {
  email: string;
  role: ClinicRole;
  ts: number;
}

export function getSession(): ClinicSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("th_clinic_session");
    return raw ? (JSON.parse(raw) as ClinicSession) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  localStorage.removeItem("th_clinic_session");
  window.location.href = LOGIN_PATH;
}

export default function ClinicAuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === LOGIN_PATH;
  const [checked, setChecked] = useState(isLoginPage);

  useEffect(() => {
    const session = getSession();

    if (!session && !isLoginPage) {
      router.replace(LOGIN_PATH);
    } else if (session && isLoginPage) {
      router.replace(session.role === "dentist" ? "/app/dentist" : "/app");
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

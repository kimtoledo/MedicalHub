import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';
import type { ClinicIdentity } from './clinic-types';

type ClinicMembership = {
  clinicId: string;
  branchId: string | null;
  role: string;
  dentistId: string | null;
};

type SessionContextResponse = {
  success: true;
  data: {
    user: { id: string; email: string; name: string };
    strategies: string[];
    clinicMemberships: ClinicMembership[];
  };
};

export async function getClinicSession(): Promise<ClinicIdentity | null> {
  const cookieHeader = cookies().toString();

  if (!cookieHeader) {
    return null;
  }

  try {
    const response = await fetch(getBackendUrl('/v1/session-context'), {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as SessionContextResponse;
    const membership = payload.success ? payload.data.clinicMemberships[0] : undefined;

    if (!payload.success || !payload.data.strategies.includes('clinicMember') || !membership) {
      return null;
    }

    return {
      id: payload.data.user.id,
      email: payload.data.user.email,
      name: payload.data.user.name,
      role: membership.role === 'dentist' ? 'dentist' : 'clinic_staff',
      clinicId: membership.clinicId,
      branchId: membership.branchId,
      dentistId: membership.dentistId,
    };
  } catch {
    return null;
  }
}

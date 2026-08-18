import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';
import type { ClinicIdentity, ClinicShellContext } from './clinic-types';

type ClinicMembership = {
  clinicId: string;
  branchId: string | null;
  role: string;
  dentistId: string | null;
  permissions?: string[];
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
      membershipRole: membership.role,
      isAdmin: membership.role === 'clinic_owner' || membership.role === 'clinic_admin',
      clinicId: membership.clinicId,
      branchId: membership.branchId,
      dentistId: membership.dentistId,
      permissions: membership.permissions ?? [],
    };
  } catch {
    return null;
  }
}

export async function getClinicShellContext(identity: ClinicIdentity): Promise<ClinicShellContext> {
  const cookieHeader = cookies().toString();
  const headers = { cookie: cookieHeader };
  const [contextResponse, entitlementResponse] = await Promise.all([
    fetch(getBackendUrl(`/v1/clinic/${encodeURIComponent(identity.clinicId)}/context`), { headers, cache: 'no-store' }),
    fetch(getBackendUrl(`/v1/entitlements/${encodeURIComponent(identity.clinicId)}`), { headers, cache: 'no-store' }),
  ]);
  if (!contextResponse.ok || !entitlementResponse.ok) throw new Error('Clinic workspace context is unavailable');
  const contextPayload = await contextResponse.json() as { success: true; data: { clinic: { id: string; name: string }; branches: ClinicShellContext['branches'] } };
  const entitlementPayload = await entitlementResponse.json() as { success: true; data: { clinic: { maintenanceMode: boolean }; subscription: { package: { name: string } } | null; entitlements: Array<{ featureKey: string; isEnabled: boolean }> } };
  const entitlements = Object.fromEntries(entitlementPayload.data.entitlements.map((item) => [item.featureKey, item.isEnabled]));
  const initialBranchId = contextPayload.data.branches.some((branch) => branch.id === identity.branchId) ? identity.branchId : contextPayload.data.branches[0]?.id ?? null;
  return { ...contextPayload.data, clinic: { ...contextPayload.data.clinic, maintenanceMode: entitlementPayload.data.clinic.maintenanceMode }, initialBranchId, entitlements, packageName: entitlementPayload.data.subscription?.package.name ?? null };
}

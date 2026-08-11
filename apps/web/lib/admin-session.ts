import 'server-only';
import { cookies } from 'next/headers';
import { getBackendUrl } from './backend';
import type { AdminIdentity } from './admin-types';

type SessionContextResponse = {
  success: true;
  data: {
    user: AdminIdentity & {
      platformRole: string | null;
    };
    strategies: string[];
  };
};

export async function getSuperAdminSession(): Promise<AdminIdentity | null> {
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
    const isSuperAdmin =
      payload.success &&
      payload.data.user.platformRole === 'super_admin' &&
      payload.data.strategies.includes('superAdmin');

    if (!isSuperAdmin) {
      return null;
    }

    return {
      id: payload.data.user.id,
      email: payload.data.user.email,
      name: payload.data.user.name,
    };
  } catch {
    return null;
  }
}

import type { clinicMemberships, users } from '@toothhub/db/schema';

export type PlatformRole = NonNullable<typeof users.$inferSelect.platformRole>;
export type ClinicRole = typeof clinicMemberships.$inferSelect.role;

export type ClinicAccess = {
  clinicId: string;
  branchId: string | null;
  role: ClinicRole;
  dentistId: string | null;
};

export type AuthorizationContext = {
  user: {
    id: string;
    email: string;
    name: string;
    platformRole: PlatformRole | null;
  };
  strategies: Array<'superAdmin' | 'clinicMember'>;
  clinicMemberships: ClinicAccess[];
};

export type BetterAuthSession = {
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
  user: {
    id: string;
    email: string;
    name: string;
  };
};

export type AuthServices = {
  handler: (request: Request) => Promise<Response>;
  getSession: (headers: Headers) => Promise<BetterAuthSession | null>;
  resolveAuthorization: (userId: string) => Promise<AuthorizationContext | null>;
};

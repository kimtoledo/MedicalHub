import { sql } from 'drizzle-orm';
import type { DB } from '@dentra/db';

type CountValue = number | string;
type AggregateRow = {
  totalClinics: CountValue;
  activeClinics: CountValue;
  trialClinics: CountValue;
  suspendedClinics: CountValue;
  archivedClinics: CountValue;
  activeSubscriptions: CountValue;
  trialSubscriptions: CountValue;
  pastDueSubscriptions: CountValue;
  totalDentists: CountValue;
  totalAppointments: CountValue;
  appointmentsLast30Days: CountValue;
};
type ActivityRow = { id: string; action: string; entityType: string; clinicName: string | null; occurredAt: Date };

export type AdminDashboardResult = {
  metrics: { totalClinics: number; currentSubscriptions: number; totalDentists: number; totalAppointments: number; appointmentsLast30Days: number };
  clinicStatuses: Record<'active' | 'trial' | 'suspended' | 'archived', number>;
  subscriptionStatuses: Record<'active' | 'trial' | 'past_due', number>;
  recentActivity: ActivityRow[];
};
export type AdminDashboardService = { get: () => Promise<AdminDashboardResult> };
const number = (value: CountValue | undefined) => Number(value ?? 0);

export function createAdminDashboardService(database: Pick<DB, 'execute'>): AdminDashboardService {
  return { get: async () => {
    const [aggregateRows, activityRows] = await Promise.all([
      database.execute<AggregateRow>(sql`
        select
          (select count(*) from clinics where deleted_at is null) as "totalClinics",
          (select count(*) from clinics where deleted_at is null and status = 'active') as "activeClinics",
          (select count(*) from clinics where deleted_at is null and status = 'trial') as "trialClinics",
          (select count(*) from clinics where deleted_at is null and status = 'suspended') as "suspendedClinics",
          (select count(*) from clinics where deleted_at is null and status = 'archived') as "archivedClinics",
          (select count(*) from clinic_subscriptions where status = 'active' and (expires_at is null or expires_at > now())) as "activeSubscriptions",
          (select count(*) from clinic_subscriptions where status = 'trial' and (expires_at is null or expires_at > now())) as "trialSubscriptions",
          (select count(*) from clinic_subscriptions where status = 'past_due') as "pastDueSubscriptions",
          (select count(*) from dentists where deleted_at is null) as "totalDentists",
          (select count(*) from appointments) as "totalAppointments",
          (select count(*) from appointments where starts_at >= now() - interval '30 days') as "appointmentsLast30Days"
      `),
      database.execute<ActivityRow>(sql`
        select audit.id, audit.action, audit.entity_type as "entityType", clinic.name as "clinicName", audit.occurred_at as "occurredAt"
        from audit_events audit
        left join clinics clinic on clinic.id = audit.clinic_id
        order by audit.occurred_at desc, audit.id desc
        limit 8
      `),
    ]);
    const row = Array.from(aggregateRows)[0];
    const activeSubscriptions = number(row?.activeSubscriptions);
    const trialSubscriptions = number(row?.trialSubscriptions);
    return {
      metrics: { totalClinics: number(row?.totalClinics), currentSubscriptions: activeSubscriptions + trialSubscriptions, totalDentists: number(row?.totalDentists), totalAppointments: number(row?.totalAppointments), appointmentsLast30Days: number(row?.appointmentsLast30Days) },
      clinicStatuses: { active: number(row?.activeClinics), trial: number(row?.trialClinics), suspended: number(row?.suspendedClinics), archived: number(row?.archivedClinics) },
      subscriptionStatuses: { active: activeSubscriptions, trial: trialSubscriptions, past_due: number(row?.pastDueSubscriptions) },
      recentActivity: Array.from(activityRows),
    };
  } };
}

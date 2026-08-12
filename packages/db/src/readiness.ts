import { sql } from 'drizzle-orm';
import type { DB } from './db';

export const REQUIRED_SCHEMA_OBJECTS = [
  'treatment_plans',
  'service_price_history',
  'invoice_transactions',
  'inventory_items',
  'notification_outbox',
  'patient_recalls',
  'clinic_gallery_items',
  'subscription_change_requests',
  'clinic_membership_permissions',
  'patient_accounts',
  'verification_submissions',
  'clinic_reviews',
  'organizations',
  'payment_links',
  'custom_domains',
  'integration_api_keys',
  'support_access_requests',
  'ai_imaging_analyses',
  'clinics.theme_preset',
  'branches.latitude',
  'services.category',
] as const;

type SchemaReadinessDatabase = Pick<DB, 'execute'>;

export class DatabaseSchemaNotReadyError extends Error {
  constructor(public readonly missingObjects: string[]) {
    super(
      `Database schema is not ready. Run npm run db:migrate and verify migration history if objects remain missing. Missing: ${missingObjects.join(', ')}`,
    );
    this.name = 'DatabaseSchemaNotReadyError';
  }
}

export async function assertDatabaseSchemaReady(
  database: SchemaReadinessDatabase,
): Promise<void> {
  const rows = await database.execute<{ objectName: string }>(sql`
    with required_objects(kind, relation_name, column_name, object_name) as (
      values
        ('table', 'treatment_plans', null, 'treatment_plans'),
        ('table', 'service_price_history', null, 'service_price_history'),
        ('table', 'invoice_transactions', null, 'invoice_transactions'),
        ('table', 'inventory_items', null, 'inventory_items'),
        ('table', 'notification_outbox', null, 'notification_outbox'),
        ('table', 'patient_recalls', null, 'patient_recalls'),
        ('table', 'clinic_gallery_items', null, 'clinic_gallery_items'),
        ('table', 'subscription_change_requests', null, 'subscription_change_requests'),
        ('table', 'clinic_membership_permissions', null, 'clinic_membership_permissions'),
        ('table', 'patient_accounts', null, 'patient_accounts'),
        ('table', 'verification_submissions', null, 'verification_submissions'),
        ('table', 'clinic_reviews', null, 'clinic_reviews'),
        ('table', 'organizations', null, 'organizations'),
        ('table', 'payment_links', null, 'payment_links'),
        ('table', 'custom_domains', null, 'custom_domains'),
        ('table', 'integration_api_keys', null, 'integration_api_keys'),
        ('table', 'support_access_requests', null, 'support_access_requests'),
        ('table', 'ai_imaging_analyses', null, 'ai_imaging_analyses'),
        ('column', 'clinics', 'theme_preset', 'clinics.theme_preset'),
        ('column', 'branches', 'latitude', 'branches.latitude'),
        ('column', 'services', 'category', 'services.category')
    )
    select object_name as "objectName"
    from required_objects required
    where (
      required.kind = 'table'
      and to_regclass('public.' || required.relation_name) is null
    ) or (
      required.kind = 'column'
      and not exists (
        select 1
        from information_schema.columns columns
        where columns.table_schema = 'public'
          and columns.table_name = required.relation_name
          and columns.column_name = required.column_name
      )
    )
    order by object_name
  `);

  const missingObjects = Array.from(rows, (row) => row.objectName);
  if (missingObjects.length > 0) {
    throw new DatabaseSchemaNotReadyError(missingObjects);
  }
}

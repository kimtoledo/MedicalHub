import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { id, timestamps } from './helpers';

/**
 * audit_events — immutable append-only audit log.
 *
 * Rules:
 * - Never UPDATE or DELETE rows in this table.
 * - Do NOT log clinical note content, diagnoses, or sensitive free-text.
 *   Log entity IDs and action codes only; retrieve details from source tables.
 * - actor_id is the authenticated user; NULL only for system-generated events.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: id(),
    /** The user who performed the action. NULL for system events. */
    actorId: uuid('actor_id'),
    actorEmail: varchar('actor_email', { length: 255 }),

    /** Tenant scope — NULL for platform-level events (e.g. clinic creation) */
    clinicId: uuid('clinic_id'),

    /** Entity being acted upon, e.g. "appointment", "patient", "clinic" */
    entityType: varchar('entity_type', { length: 100 }).notNull(),
    entityId: uuid('entity_id'),

    /** Action code from AuditAction enum in @toothhub/shared */
    action: varchar('action', { length: 100 }).notNull(),

    /**
     * Structured metadata about the change.
     * Store only non-sensitive identifiers and state transitions.
     * NEVER store clinical content, tokens, or PII beyond identifiers.
     */
    metadata: text('metadata'), // JSON string

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),

    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('audit_clinic_id_idx').on(t.clinicId),
    actorIdx: index('audit_actor_id_idx').on(t.actorId),
    entityIdx: index('audit_entity_idx').on(t.entityType, t.entityId),
    actionIdx: index('audit_action_idx').on(t.action),
    occurredAtIdx: index('audit_occurred_at_idx').on(t.occurredAt),
  }),
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;

import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { encounters } from './encounters';
import { users } from './users';

/**
 * AI interaction audit log.
 * Stores call metadata ONLY — no PHI, no prompt text, no completion text.
 */
export const aiInteractions = pgTable('ai_interactions', {
  id: uuid('id').primaryKey().defaultRandom(),

  clinicId: uuid('clinic_id')
    .notNull()
    .references(() => clinics.id, { onDelete: 'restrict' }),

  encounterId: uuid('encounter_id')
    .references(() => encounters.id, { onDelete: 'set null' }),

  actorId: uuid('actor_id')
    .references(() => users.id, { onDelete: 'set null' }),

  /** Which AI feature was invoked */
  feature: varchar('feature', { length: 50 }).notNull(),

  /** Model name e.g. gpt-4o-mini */
  model: varchar('model', { length: 100 }).notNull(),

  promptTokens:     integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  latencyMs:        integer('latency_ms'),

  /** completed | error | dismissed */
  outcome: varchar('outcome', { length: 20 }).notNull().default('completed'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AiInteraction = typeof aiInteractions.$inferSelect;
export type AiInteractionInsert = typeof aiInteractions.$inferInsert;

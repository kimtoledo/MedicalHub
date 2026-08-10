import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

/** Reusable primary key column */
export const id = () =>
  uuid('id').primaryKey().defaultRandom();

/** created_at / updated_at pair */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
};

/** Soft-delete column */
export const deletedAt = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

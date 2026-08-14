import { boolean, index, integer, pgEnum, pgTable, text, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { clinics } from './clinics';
import { dentists } from './dentists';
import { id, timestamps } from './helpers';

export const closureSourceEnum = pgEnum('closure_source', ['ph_holiday', 'custom']);

/**
 * branch_hours — structured weekly operating hours per branch, replacing the
 * free-text branches.operating_hours column. opensAt/closesAt are minutes
 * since midnight in the branch's local time (Asia/Manila). No row, or
 * is_closed = true, means the branch is closed that weekday.
 */
export const branchHours = pgTable(
  'branch_hours',
  {
    id: id(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(), // 0 = Sunday .. 6 = Saturday
    opensAt: integer('opens_at'),
    closesAt: integer('closes_at'),
    isClosed: boolean('is_closed').notNull().default(false),
    ...timestamps,
  },
  (t) => ({
    branchIdx: index('branch_hours_branch_id_idx').on(t.branchId),
    branchWeekdayUnique: unique('branch_hours_branch_weekday_unique').on(t.branchId, t.weekday),
  }),
);

/**
 * clinic_closures — dates a clinic is closed: Philippine public holidays
 * (auto-seeded per year as source = 'ph_holiday', toggleable via is_enabled)
 * and clinic-added one-off closures (source = 'custom'). A NULL branch_id
 * applies to every branch of the clinic; a set branch_id overrides for that
 * branch only.
 */
export const clinicClosures = pgTable(
  'clinic_closures',
  {
    id: id(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'cascade' }),
    date: varchar('date', { length: 10 }).notNull(), // YYYY-MM-DD
    label: varchar('label', { length: 200 }).notNull(),
    source: closureSourceEnum('source').notNull().default('custom'),
    isEnabled: boolean('is_enabled').notNull().default(true),
    ...timestamps,
  },
  (t) => ({
    clinicIdx: index('clinic_closures_clinic_id_idx').on(t.clinicId),
    clinicDateIdx: index('clinic_closures_clinic_date_idx').on(t.clinicId, t.date),
  }),
);

/**
 * dentist_schedules — a dentist's normal weekly working pattern at a branch.
 * A dentist with zero rows at a branch is unrestricted (falls back to the
 * branch's own hours) for backward compatibility with dentists who haven't
 * configured individual hours yet. Configuring at least one row makes every
 * other weekday at that branch "not working" by omission.
 */
export const dentistSchedules = pgTable(
  'dentist_schedules',
  {
    id: id(),
    dentistId: uuid('dentist_id')
      .notNull()
      .references(() => dentists.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at').notNull(),
    ...timestamps,
  },
  (t) => ({
    dentistIdx: index('dentist_schedules_dentist_id_idx').on(t.dentistId),
    branchIdx: index('dentist_schedules_branch_id_idx').on(t.branchId),
    dentistBranchWeekdayUnique: unique('dentist_schedules_dentist_branch_weekday_unique').on(t.dentistId, t.branchId, t.weekday),
  }),
);

/**
 * dentist_time_off — one-off leave/vacation/sick blocks, independent of the
 * weekly pattern. A dentist is unavailable for the whole inclusive date range.
 */
export const dentistTimeOff = pgTable(
  'dentist_time_off',
  {
    id: id(),
    dentistId: uuid('dentist_id')
      .notNull()
      .references(() => dentists.id, { onDelete: 'cascade' }),
    startDate: varchar('start_date', { length: 10 }).notNull(),
    endDate: varchar('end_date', { length: 10 }).notNull(),
    reason: text('reason'),
    ...timestamps,
  },
  (t) => ({
    dentistIdx: index('dentist_time_off_dentist_id_idx').on(t.dentistId),
  }),
);

export type BranchHours = typeof branchHours.$inferSelect;
export type NewBranchHours = typeof branchHours.$inferInsert;
export type ClinicClosure = typeof clinicClosures.$inferSelect;
export type NewClinicClosure = typeof clinicClosures.$inferInsert;
export type DentistSchedule = typeof dentistSchedules.$inferSelect;
export type NewDentistSchedule = typeof dentistSchedules.$inferInsert;
export type DentistTimeOff = typeof dentistTimeOff.$inferSelect;
export type NewDentistTimeOff = typeof dentistTimeOff.$inferInsert;

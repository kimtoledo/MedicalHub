// Note: zod is installed at the monorepo root (node_modules)
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
export const uuidSchema = z.string().uuid();

/** Philippine mobile: 09XXXXXXXXX or +639XXXXXXXXX */
export const phMobileSchema = z
  .string()
  .regex(/^(\+639|09)\d{9}$/, 'Must be a valid Philippine mobile number');

/** URL-safe slug: lowercase letters, digits, hyphens, 3-80 chars */
export const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, digits, and hyphens only');

export const emailSchema = z.string().email().max(255).toLowerCase().trim();

export const isoDateSchema = z.string().datetime({ offset: true });

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type Pagination = z.infer<typeof paginationSchema>;

// ---------------------------------------------------------------------------
// Common response shapes
// ---------------------------------------------------------------------------
export const successResponseSchema = z.object({
  success: z.literal(true),
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Clinic
// ---------------------------------------------------------------------------
export const clinicSlugSchema = slugSchema;

export const createClinicSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  slug: clinicSlugSchema,
  email: emailSchema.optional(),
  phone: phMobileSchema.optional(),
  website: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
});
export type CreateClinic = z.infer<typeof createClinicSchema>;

// ---------------------------------------------------------------------------
// Branch
// ---------------------------------------------------------------------------
export const createBranchSchema = z.object({
  clinicId: uuidSchema,
  name: z.string().min(2).max(200).trim(),
  address: z.string().max(500).trim(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  phone: phMobileSchema.optional(),
  email: emailSchema.optional(),
});
export type CreateBranch = z.infer<typeof createBranchSchema>;

// ---------------------------------------------------------------------------
// Dentist
// ---------------------------------------------------------------------------
export const createDentistSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  slug: slugSchema,
  licenseNumber: z.string().max(50).optional(),
  specialty: z.string().max(200).optional(),
  bio: z.string().max(3000).optional(),
  phone: phMobileSchema.optional(),
  email: emailSchema.optional(),
});
export type CreateDentist = z.infer<typeof createDentistSchema>;

// ---------------------------------------------------------------------------
// Appointment
// ---------------------------------------------------------------------------
export const createAppointmentSchema = z.object({
  clinicId: uuidSchema,
  branchId: uuidSchema,
  dentistId: uuidSchema.optional(),
  serviceId: uuidSchema,
  /** ISO-8601 datetime string for appointment start */
  startsAt: isoDateSchema,
  /** Patient contact info for public booking (not linked to a patient account yet) */
  patientFirstName: z.string().min(1).max(100).trim(),
  patientLastName: z.string().min(1).max(100).trim(),
  patientPhone: phMobileSchema,
  patientEmail: emailSchema.optional(),
  chiefComplaint: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateAppointment = z.infer<typeof createAppointmentSchema>;

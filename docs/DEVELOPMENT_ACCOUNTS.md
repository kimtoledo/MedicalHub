# Development login accounts

The focused account seed creates or refreshes the existing synthetic login users
without seeding patients, appointments, billing, or other demo records.

## Setup

1. Apply database migrations and seed the base demo clinics, branches, and dentist
   records once with `npm run db:seed`.
2. Put these values in the git-ignored root `.env` file, or in Replit Secrets:
   - `DEV_SUPER_ADMIN_PASSWORD`
   - `DEV_CLINIC_PASSWORD`
3. Each password must contain at least 10 characters.
4. Run `npm run db:seed:accounts`.

The command validates both passwords before any account write. It never prints
passwords or hashes. Re-running it updates the same users, credential accounts,
and memberships rather than adding duplicates.

## Seeded emails

| Access | Email |
|---|---|
| Super Admin | `admin@dentra.ph` |
| Smile Bright clinic admin | `admin@smilebrightdental.ph` |
| Smile Bright receptionist | `reception@smilebrightdental.ph` |
| Smile Bright dental assistant | `assistant@smilebrightdental.ph` |
| BrightSmile clinic admin | `admin@brightsmile.ph` |
| BrightSmile receptionist | `reception@brightsmile.ph` |
| BrightSmile dental assistant | `assistant@brightsmile.ph` |
| Smile Bright dentist | `dr.reyes@smilebrightdental.ph` |

Clinic staff and the dentist use `DEV_CLINIC_PASSWORD`; the Super Admin uses
`DEV_SUPER_ADMIN_PASSWORD`. These accounts are for development only.
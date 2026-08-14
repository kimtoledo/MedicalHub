import { eq, sql } from 'drizzle-orm';
import { createRequire } from 'node:module';
import type { DB } from '@dentra/db';
import { platformSettings } from '@dentra/db/schema';
import { writeAudit } from '@dentra/db/audit';
import { AuditAction } from '@dentra/shared';
import type { ApiConfig } from '../config.js';

export type PlatformSettingsActor = { id: string; email: string; ipAddress?: string; userAgent?: string };
export type PlatformSettingsInput = { supportEmail?: string | null; supportPhone?: string | null; maintenanceBannerEnabled?: boolean; maintenanceBannerMessage?: string | null };
export class PlatformSettingsError extends Error { constructor(public code: string, message: string, public statusCode = 400) { super(message); } }
export type PlatformSettingsService = ReturnType<typeof createPlatformSettingsService>;

// Resolved relative to this module's own location, which sits at a
// different depth in dev (src/admin/, unbundled) vs. production
// (dist/, bundled into a single file by tsup) — try both.
const appVersion = (() => {
  const require = createRequire(import.meta.url);
  for (const candidate of ['../package.json', '../../package.json']) {
    try {
      return require(candidate).version as string;
    } catch { /* try the next candidate depth */ }
  }
  return 'unknown';
})();

export function createPlatformSettingsService(database: DB, config: ApiConfig) {
  const ensureRow = async () => {
    const [existing] = await database.select().from(platformSettings).limit(1);
    if (existing) return existing;
    const [created] = await database.insert(platformSettings).values({}).returning();
    return created;
  };

  return {
    get: async () => ensureRow(),

    update: async (input: PlatformSettingsInput, actor: PlatformSettingsActor) => database.transaction(async (tx) => {
      const [existing] = await tx.select().from(platformSettings).limit(1).for('update');
      const current = existing ?? (await tx.insert(platformSettings).values({}).returning())[0];
      const changes: Record<string, unknown> = {};
      if (input.supportEmail !== undefined && input.supportEmail !== current.supportEmail) changes.supportEmail = input.supportEmail;
      if (input.supportPhone !== undefined && input.supportPhone !== current.supportPhone) changes.supportPhone = input.supportPhone;
      if (input.maintenanceBannerEnabled !== undefined && input.maintenanceBannerEnabled !== current.maintenanceBannerEnabled) changes.maintenanceBannerEnabled = input.maintenanceBannerEnabled;
      if (input.maintenanceBannerMessage !== undefined && input.maintenanceBannerMessage !== current.maintenanceBannerMessage) changes.maintenanceBannerMessage = input.maintenanceBannerMessage;
      if (Object.keys(changes).length === 0) return current;
      const [updated] = await tx.update(platformSettings).set({ ...changes, updatedBy: actor.id, updatedAt: new Date() }).where(eq(platformSettings.id, current.id)).returning();
      await writeAudit(tx, { actorId: actor.id, actorEmail: actor.email, clinicId: null, entityType: 'platform_settings', entityId: current.id, action: AuditAction.PLATFORM_SETTINGS_UPDATED, metadata: JSON.stringify({ fields: Object.keys(changes) }), ipAddress: actor.ipAddress, userAgent: actor.userAgent });
      return updated;
    }),

    runtimeSummary: async () => {
      let databaseConnected = true;
      try { await database.execute(sql`select 1`); } catch { databaseConnected = false; }
      return {
        nodeEnv: config.nodeEnv,
        appVersion,
        uptimeSeconds: Math.floor(process.uptime()),
        serverTimeUtc: new Date().toISOString(),
        databaseConnected,
      };
    },
  };
}

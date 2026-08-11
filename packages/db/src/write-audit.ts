import type { DB } from './db';
import { auditEvents, type NewAuditEvent } from './schema';

type DBTransaction = Parameters<Parameters<DB['transaction']>[0]>[0];
type AuditWriter = DB | DBTransaction;

/**
 * Append one or more immutable audit events using the caller's database or
 * transaction. Passing the active transaction keeps the domain mutation and
 * its audit trail atomic.
 */
export async function writeAudit(
  writer: AuditWriter,
  event: NewAuditEvent | NewAuditEvent[],
): Promise<void> {
  if (Array.isArray(event)) {
    await writer.insert(auditEvents).values(event);
    return;
  }

  await writer.insert(auditEvents).values(event);
}

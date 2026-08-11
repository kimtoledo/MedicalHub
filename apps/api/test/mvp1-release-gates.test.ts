import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const repoFile = (path: string) => new URL(`../../../${path}`, import.meta.url);

describe('MVP 1 static release gates', () => {
  it('never routes protected API requests through the service-worker cache', async () => {
    const source = await readFile(repoFile('apps/web/public/sw.js'), 'utf8');
    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain('url.pathname.startsWith("/v1/")');
    expect(source).toMatch(/event\.request\.method !== "GET" \|\| isApiRequest\(url\)/);
    expect(source).not.toMatch(/cache\.put\(event\.request/);
    const shellAssets = source.match(/const SHELL_ASSETS = \[([\s\S]*?)\];/)?.[1] ?? '';
    expect(shellAssets).not.toMatch(/["']\/(?:api|v1)\//);
  });

  it('keeps the demo seed explicitly synthetic and at the release target size', async () => {
    const source = await readFile(repoFile('scripts/seed-demo.ts'), 'utf8');
    expect(source).toContain('entirely synthetic');
    expect(source).toContain("'PRC-DEN-");
    expect(source).toContain("count = 25");
    expect(source).toContain("'SBD', QC_BARANGAYS, 'Quezon City', 'Metro Manila', 10");
    expect(source).toContain("'BSM', MAKATI_BARANGAYS, 'Makati', 'Metro Manila', 10");
    expect(source).toContain('Appointments: 25 per clinic (50 total)');
  });

  it('ships a database guard that makes audit events append-only', async () => {
    const migration = await readFile(repoFile('packages/db/migrations/0007_audit_immutability.sql'), 'utf8');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON audit_events');
    expect(migration).toContain("ERRCODE = '55000'");
  });
});

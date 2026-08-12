import { describe, expect, it, vi } from 'vitest';
import type { DB } from '@dentra/db';
import {
  assertDatabaseSchemaReady,
  DatabaseSchemaNotReadyError,
} from '@dentra/db/readiness';

describe('database schema readiness', () => {
  it('accepts a database with every required schema object', async () => {
    const database = { execute: vi.fn(async () => []) } as unknown as Pick<DB, 'execute'>;

    await expect(assertDatabaseSchemaReady(database)).resolves.toBeUndefined();
  });

  it('reports missing objects without exposing connection details', async () => {
    const database = {
      execute: vi.fn(async () => [
        { objectName: 'ai_imaging_analyses' },
        { objectName: 'clinics.theme_preset' },
      ]),
    } as unknown as Pick<DB, 'execute'>;

    await expect(assertDatabaseSchemaReady(database)).rejects.toEqual(
      new DatabaseSchemaNotReadyError([
        'ai_imaging_analyses',
        'clinics.theme_preset',
      ]),
    );
  });
});

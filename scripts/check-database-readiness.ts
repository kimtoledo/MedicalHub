import dotenv from 'dotenv';

dotenv.config();

async function main(): Promise<void> {
  const {
    assertDatabaseSchemaReady,
    closeDatabase,
    db,
  } = await import('@dentra/db');

  try {
    await assertDatabaseSchemaReady(db);
    console.log('✅  Database schema readiness check passed.');
  } finally {
    await closeDatabase();
  }
}

void main();

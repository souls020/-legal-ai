import { initSchema } from './schema.js';

interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down?: () => Promise<void>;
}

const migrations: Migration[] = [
  {
    id: '001_create_users_tables',
    name: 'Create users, profiles, and sessions tables',
    up: async () => {
      await initSchema();
    }
  }
];

export async function runMigrations(): Promise<void> {
  console.log('Running migrations...');

  await initSchema();

  console.log('All migrations completed successfully');
}

// Run migrations only if this file is executed directly (not when imported)
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  runMigrations().catch(console.error);
}

import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('[migrate] DATABASE_URL is not set; refusing to start without a database.');
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL('../db/migrations', import.meta.url));
const pool = new Pool({ connectionString, max: 1 });

try {
  await migrate(drizzle(pool), { migrationsFolder });
  console.log('[migrate] database is up to date');
} catch (error) {
  console.error('[migrate] migration failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDB | null = null;
let _pool: Pool | null = null;

function getDb(): DrizzleDB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  _pool = new Pool({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // A runaway query is stopped instead of holding a connection forever.
    statement_timeout: 30_000,
  });
  // An idle connection dropped by the database (restart, failover) emits an error on the pool.
  // Without a listener Node treats it as uncaught and the whole server exits.
  _pool.on('error', (error) => {
    console.error('[db] idle connection error', error.message);
  });
  _db = drizzle(_pool, { schema });

  // Dev-only warning: alert if the users table is empty so login failures are obvious.
  if (process.env.NODE_ENV !== 'production') {
    _db.select({ count: sql<number>`count(*)` }).from(schema.users)
      .then((res) => {
        if (res[0]?.count === 0) {
          console.warn(
            '\n⚠️  [db/client] The users table is empty — no accounts exist to log in with.\n   Run: npm run db:seed\n'
          );
        }
      })
      .catch(() => {
        // Silently ignore — DB may not be reachable during build or tests.
      });
  }

  return _db;
}

export const db = new Proxy({} as DrizzleDB, {
  get(_target, prop) {
    return Reflect.get(getDb() as object, prop);
  },
});

export type DB = DrizzleDB;

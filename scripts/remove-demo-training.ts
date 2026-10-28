// Removes the two demo training sessions that the old seed inserted, so they stop appearing on
// the public training calendar and dashboards.
//
// Dry run (default):  npx tsx scripts/remove-demo-training.ts
// Delete them:        npx tsx scripts/remove-demo-training.ts --apply
import { config } from 'dotenv';
config({ path: '.env.local' });

import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { trainingSessions } from '../db/schema/index';

const DEMO_TRAINER_NAME = 'Demo Trainer';
const DEMO_TRAINER_EMAIL = 'trainer@coolpro.demo';

async function main() {
  const apply = process.argv.includes('--apply');
  const where = and(
    eq(trainingSessions.trainerName, DEMO_TRAINER_NAME),
    eq(trainingSessions.trainerEmail, DEMO_TRAINER_EMAIL)
  );

  const matches = await db
    .select({ id: trainingSessions.id, title: trainingSessions.title, startDate: trainingSessions.startDate })
    .from(trainingSessions)
    .where(where);

  if (matches.length === 0) {
    console.log('No demo training sessions found; nothing to do.');
    return;
  }

  for (const row of matches) {
    console.log(`${apply ? 'delete' : 'would delete'}: ${row.title} (${row.startDate.toISOString().slice(0, 10)})`);
  }

  if (matches.length > 10) {
    throw new Error(`Refusing to delete ${matches.length} rows; expected only a handful of seeded demo sessions.`);
  }

  if (!apply) {
    console.log(`\nDry run: ${matches.length} session(s) matched. Re-run with --apply to delete.`);
    return;
  }

  const deleted = await db.delete(trainingSessions).where(where).returning({ id: trainingSessions.id });
  console.log(`\nDeleted ${deleted.length} demo training session(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });

import { sql } from 'drizzle-orm';
import type { DbOrTxClient } from '@db/drizzle';

export async function lockLearningInstance(dbClient: DbOrTxClient) {
  await dbClient.execute(sql`select pg_advisory_xact_lock(713463, 1)`);
}

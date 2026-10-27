import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Database from '@cio/db/drizzle';
import type { ensureLearningInstance } from '@api/services/learning-instance';

const testDatabaseUrl = process.env.LEARNING_INSTANCE_TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;

integration('MP Learning bootstrap on isolated PostgreSQL', () => {
  let database: typeof Database;
  let initialize: typeof ensureLearningInstance;
  const firstAdminId = randomUUID();
  const secondAdminId = randomUUID();
  const emails = [`first-${firstAdminId}@example.com`, `second-${secondAdminId}@example.com`];

  beforeAll(async () => {
    const databaseName = new URL(testDatabaseUrl!).pathname.slice(1);
    if (!databaseName.startsWith('mp_learning_single_instance_') || !databaseName.endsWith('_test')) {
      throw new Error('Bootstrap integration tests require a dedicated mp_learning_single_instance_*_test database');
    }

    vi.stubEnv('DATABASE_URL', testDatabaseUrl!);
    vi.stubEnv('PGBOUNCER_DATABASE_URL', '');
    vi.stubEnv('LMS_ALLOWED_EMAILS', emails.join(','));
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected test database');

    initialize = (await import('@api/services/learning-instance')).ensureLearningInstance;
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
    await database.db.insert(database.user).values([
      { id: firstAdminId, name: 'First administrator', email: emails[0], emailVerified: true },
      { id: secondAdminId, name: 'Second administrator', email: emails[1], emailVerified: true }
    ]);
    await database.db.insert(database.profile).values([
      { id: firstAdminId, fullname: 'First administrator', username: firstAdminId, email: emails[0] },
      { id: secondAdminId, fullname: 'Second administrator', username: secondAdminId, email: emails[1] }
    ]);
  }, 30000);

  beforeEach(async () => {
    await database.db.execute(database.sql`truncate table organization cascade`);
  });

  afterEach(async () => {
    await database.db.execute(database.sql`drop trigger if exists reject_bootstrap_plan on organization_plan`);
    await database.db.execute(database.sql`drop function if exists reject_bootstrap_plan()`);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('serializes concurrent first sign-ins into one company and one administrator', async () => {
    const [first, second] = await Promise.all([
      initialize(firstAdminId, emails[0]),
      initialize(secondAdminId, emails[1])
    ]);
    expect(first.id).toBe(second.id);
    const organizations = await database.db.select().from(database.organization);
    const members = await database.db.select().from(database.organizationmember);
    const plans = await database.db.select().from(database.organizationPlan);
    expect(organizations).toHaveLength(1);
    expect(organizations[0]).toMatchObject({ name: 'MP Transformation', siteName: 'mp-transformation' });
    expect(members).toHaveLength(1);
    expect(members[0].roleId).toBe(1);
    expect(plans).toHaveLength(1);
  });

  it('rolls back the company and administrator when writing the plan fails', async () => {
    await database.db.execute(
      database.sql`create function reject_bootstrap_plan() returns trigger language plpgsql as $$ begin raise exception 'bootstrap plan rejected'; end; $$`
    );
    await database.db.execute(
      database.sql`create trigger reject_bootstrap_plan before insert on organization_plan for each row execute function reject_bootstrap_plan()`
    );
    await expect(initialize(firstAdminId, emails[0])).rejects.toMatchObject({
      cause: { message: 'bootstrap plan rejected' }
    });
    const organizations = await database.db.select().from(database.organization);
    const members = await database.db.select().from(database.organizationmember);
    const plans = await database.db.select().from(database.organizationPlan);
    expect(organizations).toHaveLength(0);
    expect(members).toHaveLength(0);
    expect(plans).toHaveLength(0);
  });

  it('retains the existing identity and never elevates another approved account', async () => {
    const original = await initialize(firstAdminId, emails[0]);
    await database.db
      .update(database.organization)
      .set({ siteName: 'existing-company' })
      .where(database.eq(database.organization.id, original.id));
    const existing = await initialize(secondAdminId, emails[1]);
    const members = await database.db.select().from(database.organizationmember);
    expect(existing.id).toBe(original.id);
    expect(existing.siteName).toBe('existing-company');
    expect(members).toHaveLength(1);
    expect(members[0].profileId).toBe(firstAdminId);
  });

  it('rejects an unapproved initializer without persisting anything', async () => {
    await expect(initialize(firstAdminId, 'outsider@example.com')).rejects.toThrow('approved administrator');
    const organizations = await database.db.select().from(database.organization);
    expect(organizations).toHaveLength(0);
  });
});

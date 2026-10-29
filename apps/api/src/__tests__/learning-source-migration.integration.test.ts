import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('learning source migration on an isolated schema', () => {
  it('preserves historical access and collapses catalog flags without expanding access', async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('An isolated database is required');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    const { db, sql } = await import('@cio/db/drizzle');
    const [connection] = await db.execute(sql`select current_database() name`);
    expect(connection.name).toBe(databaseName);
    const schemaName = `migration_${randomUUID().replaceAll('-', '')}`;
    const statements = readFileSync(
      new URL('../../../../packages/db/src/migrations/0044_learning_sources_and_assignments.sql', import.meta.url),
      'utf8'
    ).split('--> statement-breakpoint');
    const rollback = new Error('Rollback isolated migration fixture');
    await expect(
      db.transaction(async (transaction) => {
        await transaction.execute(sql.raw(`create schema ${schemaName}`));
        await transaction.execute(sql.raw(`set local search_path to ${schemaName}, public`));
        await transaction.execute(sql`create table profile(id uuid primary key)`);
        await transaction.execute(
          sql`create table course(id uuid primary key, group_id uuid, type text, metadata jsonb)`
        );
        await transaction.execute(
          sql`create table groupmember(id uuid primary key, group_id uuid, profile_id uuid, role_id bigint, created_at timestamptz, completed_at timestamptz)`
        );
        const profileId = randomUUID();
        const groupId = randomUUID();
        const memberId = randomUUID();
        await transaction.execute(sql`insert into profile values (${profileId})`);
        const cases = [
          { metadata: {}, type: 'SELF_PACED', open: true },
          { metadata: {}, type: null, open: true },
          { metadata: { showInLibrary: false, allowSelfEnrollment: true }, type: 'SELF_PACED', open: false },
          { metadata: { showInLibrary: true, allowSelfEnrollment: false }, type: 'SELF_PACED', open: false },
          { metadata: { allowNewStudent: false }, type: 'SELF_PACED', open: false },
          { metadata: { allowSelfEnrollment: true }, type: 'COMPLIANCE', open: false }
        ];
        const courseIds = [];
        for (const fixture of cases) {
          const courseId = randomUUID();
          courseIds.push(courseId);
          await transaction.execute(
            sql`insert into course values (${courseId}, ${groupId}, ${fixture.type}, ${JSON.stringify(fixture.metadata)}::jsonb)`
          );
        }
        await transaction.execute(
          sql`insert into groupmember values (${memberId}, ${groupId}, ${profileId}, 3, now(), '2026-10-01T00:00:00Z')`
        );
        for (const statement of statements) await transaction.execute(sql.raw(statement));

        for (const [index, courseId] of courseIds.entries()) {
          const [course] = await transaction.execute<{
            metadata: { allowSelfEnrollment: boolean; showInLibrary?: boolean };
          }>(sql`select metadata from course where id = ${courseId}`);
          expect(course.metadata.allowSelfEnrollment).toBe(cases[index].open);
          expect(course.metadata).not.toHaveProperty('showInLibrary');
        }
        const sources = await transaction.execute(sql`select kind from course_enrollment_source`);
        expect(sources).toHaveLength(cases.length);
        expect(sources.every((source) => source.kind === 'LEGACY')).toBe(true);
        const assignments = await transaction.execute(sql`select id from course_training_assignment`);
        expect(assignments).toHaveLength(0);
        const [member] = await transaction.execute<{ completed_at: string; learning_access_managed: boolean }>(
          sql`select completed_at, learning_access_managed from groupmember`
        );
        expect(new Date(member.completed_at).toISOString()).toBe('2026-10-01T00:00:00.000Z');
        expect(member.learning_access_managed).toBe(true);
        throw rollback;
      })
    ).rejects.toBe(rollback);
    const [remaining] = await db.execute<{ count: number }>(
      sql`select count(*)::int count from information_schema.schemata where schema_name = ${schemaName}`
    );
    expect(remaining.count).toBe(0);
  }, 30000);
});

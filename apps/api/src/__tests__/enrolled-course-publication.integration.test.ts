import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';

const testDatabaseUrl = process.env.COURSE_ACCESS_TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;

integration('learner course publication visibility', () => {
  let database: typeof import('@cio/db/drizzle');
  let getEnrolledCourses: (typeof import('@cio/db/queries/course'))['getEnrolledCourses'];
  let getCourse: (typeof import('@cio/core/services/course/course'))['getCourse'];
  const organizationId = randomUUID();
  const profileId = randomUUID();
  const email = `${profileId}@example.com`;

  beforeAll(async () => {
    const databaseName = decodeURIComponent(new URL(testDatabaseUrl!).pathname.slice(1));
    if (!databaseName.endsWith('_test')) throw new Error('Course visibility tests require a dedicated test database');

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected database for course visibility tests');

    getEnrolledCourses = (await import('@cio/db/queries/course')).getEnrolledCourses;
    getCourse = (await import('@cio/core/services/course/course')).getCourse;
    await database.db
      .insert(database.role)
      .values([{ id: 3, type: 'STUDENT' }])
      .onConflictDoNothing();
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Course visibility test' });
    await database.db.insert(database.user).values({ id: profileId, email, name: 'Test learner', emailVerified: true });
    await database.db
      .insert(database.profile)
      .values({ id: profileId, email, fullname: 'Test learner', username: profileId, isEmailVerified: true });
    await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId, email, roleId: 3, verified: true });
  }, 30000);

  async function createCourse(isPublished: boolean) {
    const groupId = randomUUID();
    const courseId = randomUUID();
    await database.db.insert(database.group).values({ id: groupId, name: 'Test course group', organizationId });
    await database.db
      .insert(database.course)
      .values({ id: courseId, groupId, title: 'Publication test', description: 'Learner access test', isPublished });
    return { courseId, groupId };
  }

  it('lists direct assignments only after publication and keeps the enrollment when hidden', async () => {
    const course = await createCourse(false);
    await database.db.insert(database.groupmember).values({ groupId: course.groupId, profileId, email, roleId: 3 });
    const beforePublish = await getEnrolledCourses({ orgId: organizationId, profileId });
    expect(beforePublish.some((enrolled) => enrolled.id === course.courseId)).toBe(false);

    await database.db
      .update(database.course)
      .set({ isPublished: true })
      .where(database.eq(database.course.id, course.courseId));
    const published = await getEnrolledCourses({ orgId: organizationId, profileId });
    expect(published.some((enrolled) => enrolled.id === course.courseId)).toBe(true);

    await database.db
      .update(database.course)
      .set({ isPublished: false })
      .where(database.eq(database.course.id, course.courseId));
    const hidden = await getEnrolledCourses({ orgId: organizationId, profileId });
    expect(hidden.some((enrolled) => enrolled.id === course.courseId)).toBe(false);
    const enrollments = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId));
    expect(enrollments).toHaveLength(1);
  });

  it('applies the publication rule to program-only assignments', async () => {
    const draft = await createCourse(false);
    const published = await createCourse(true);
    const programId = randomUUID();
    await database.db.insert(database.program).values({ id: programId, organizationId, name: 'Test program' });
    await database.db.insert(database.programCourse).values([
      { programId, courseId: draft.courseId },
      { programId, courseId: published.courseId }
    ]);
    await database.db.insert(database.programMember).values({ programId, profileId, email, roleId: 3 });
    const courses = await getEnrolledCourses({ orgId: organizationId, profileId });
    expect(courses.some((course) => course.id === draft.courseId)).toBe(false);
    expect(courses.some((course) => course.id === published.courseId)).toBe(true);
  });

  it('keeps draft content protected while allowing an enrolled learner to open a published course', async () => {
    const draft = await createCourse(false);
    const published = await createCourse(true);
    await database.db.insert(database.groupmember).values([
      { groupId: draft.groupId, profileId, email, roleId: 3 },
      { groupId: published.groupId, profileId, email, roleId: 3 }
    ]);
    await expect(getCourse(draft.courseId, undefined, profileId)).rejects.toMatchObject({
      code: 'COURSE_NOT_FOUND',
      statusCode: 404
    });
    const opened = await getCourse(published.courseId, undefined, profileId);
    expect(opened.id).toBe(published.courseId);
  });
});

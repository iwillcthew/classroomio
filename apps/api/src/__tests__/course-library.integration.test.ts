import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@api/services/course/employees', () => ({ sendCourseAccessEmail: vi.fn() }));
vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: vi.fn() }));
vi.mock('@cio/core/services/webhook/emit', () => ({
  buildMemberSource: (method: string) => ({ method }),
  emitCourseMemberAddedWebhookEvent: vi.fn()
}));
vi.mock('@api/services/product-events', () => ({ captureLearnersEnrolled: vi.fn() }));

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('course library on isolated PostgreSQL', () => {
  let database: typeof import('@cio/db/drizzle');
  let queries: typeof import('@cio/db/queries/course');
  let services: typeof import('@api/services/course/library');
  let email: typeof import('@api/services/course/employees');
  let organizationId: string;
  let profileId: string;
  let employeeId: string;
  let memberId: number;
  let userEmail: string;

  beforeAll(async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('Library tests require a database ending in _test');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected library test database');

    queries = await import('@cio/db/queries/course');
    services = await import('@api/services/course/library');
    email = await import('@api/services/course/employees');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
  }, 30000);

  beforeEach(async () => {
    vi.clearAllMocks();
    organizationId = randomUUID();
    profileId = randomUUID();
    userEmail = `${profileId}@example.com`;
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Library tests' });
    await database.db
      .insert(database.user)
      .values({ id: profileId, name: 'Learner', email: userEmail, emailVerified: true });
    await database.db
      .insert(database.profile)
      .values({ id: profileId, fullname: 'Learner', email: userEmail, username: profileId });
    const [member] = await database.db
      .insert(database.organizationmember)
      .values({
        organizationId,
        profileId,
        email: userEmail,
        roleId: 3,
        verified: true
      })
      .returning();
    memberId = member.id;
    const [employee] = await database.db
      .insert(database.employee)
      .values({
        organizationId,
        memberId,
        employeeCode: profileId.toUpperCase(),
        fullname: 'Learner',
        email: userEmail,
        status: 'ACTIVE'
      })
      .returning();
    employeeId = employee.id;
  });

  async function createCourse(overrides: Partial<typeof database.course.$inferInsert> = {}) {
    const [group] = await database.db
      .insert(database.group)
      .values({ organizationId, name: 'Library group' })
      .returning();
    const values = {
      title: 'Library course',
      description: 'Course introduction',
      groupId: group.id,
      isPublished: true,
      metadata: { showInLibrary: true, allowSelfEnrollment: true },
      ...overrides
    };
    const [course] = await database.db.insert(database.course).values(values).returning();
    return course;
  }

  it('preserves legacy visibility while excluding drafts, templates, hidden and foreign courses', async () => {
    const legacy = await createCourse({ metadata: {} });
    const legacyClosed = await createCourse({ metadata: { allowNewStudent: false } });
    const assignedOnly = await createCourse({ metadata: { showInLibrary: true, allowSelfEnrollment: false } });
    await createCourse({ isPublished: false });
    await createCourse({ isTemplate: true });
    await createCourse({ status: 'DELETED' });
    const open = await createCourse({ metadata: { showInLibrary: false, allowSelfEnrollment: true } });
    const result = await services.listCourseLibrary(organizationId, profileId);
    expect(result.total).toBe(2);
    expect(result.data.map((course) => course.id).sort()).toEqual([legacy.id, open.id].sort());
    expect(result.data.find((course) => course.id === assignedOnly.id)).toBeUndefined();
    await expect(services.getCourseLibraryDetails(organizationId, profileId, legacyClosed.id)).rejects.toMatchObject({
      statusCode: 404
    });
    expect(result.data[0]).not.toHaveProperty('metadata');
    expect(result.data[0]).not.toHaveProperty('cost');
    expect(result.data[0]).not.toHaveProperty('groupId');
  });

  it('keeps enrolled courses in the library, in my learning, and out of recommendations', async () => {
    const course = await createCourse();
    await services.enrollInternalLearner(organizationId, course.id, { id: profileId, email: userEmail });
    const details = await services.getCourseLibraryDetails(organizationId, profileId, course.id);
    expect(details).toMatchObject({ isEnrolled: true, hasAccess: true, canSelfEnroll: false });
    const learning = await queries.getEnrolledCourses({ orgId: organizationId, profileId });
    expect(learning.map((entry) => entry.id)).toContain(course.id);
    const recommended = await services.listCourseLibrary(organizationId, profileId, {}, true);
    expect(recommended.total).toBe(0);
    await database.db
      .update(database.course)
      .set({ metadata: { showInLibrary: false, allowSelfEnrollment: false } })
      .where(database.eq(database.course.id, course.id));
    expect((await services.getCourseLibraryDetails(organizationId, profileId, course.id)).hasAccess).toBe(true);
  });

  it('recognizes program and cohort access without materializing duplicate memberships', async () => {
    const course = await createCourse({ metadata: { showInLibrary: false, allowSelfEnrollment: false } });
    const [program] = await database.db
      .insert(database.program)
      .values({ organizationId, name: 'Program' })
      .returning();
    const [cohort] = await database.db.insert(database.cohort).values({ organizationId, name: 'Cohort' }).returning();
    await database.db.insert(database.programCourse).values({ programId: program.id, courseId: course.id });
    await database.db.insert(database.programMember).values({ programId: program.id, profileId, roleId: 3 });
    await database.db.insert(database.cohortCourse).values({ cohortId: cohort.id, courseId: course.id });
    await database.db.insert(database.cohortMember).values({ cohortId: cohort.id, profileId, roleId: 3 });
    expect((await services.listCourseLibrary(organizationId, profileId)).total).toBe(0);
    const enrolled = await services.enrollInternalLearner(organizationId, course.id, {
      id: profileId,
      email: userEmail
    });
    expect(enrolled.alreadyJoined).toBe(true);
    const direct = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(direct).toHaveLength(0);
    await database.db.delete(database.programMember).where(database.eq(database.programMember.profileId, profileId));
    expect((await queries.getEnrolledCourses({ orgId: organizationId, profileId })).map((entry) => entry.id)).toContain(
      course.id
    );
    expect((await services.listCourseLibrary(organizationId, profileId, {}, true)).total).toBe(0);
  });

  it('serializes concurrent enrollment and never resets completion on a retry', async () => {
    const course = await createCourse();
    const user = { id: profileId, email: userEmail };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => services.enrollInternalLearner(organizationId, course.id, user))
    );
    expect(results.filter((result) => !result.alreadyJoined)).toHaveLength(1);
    expect(email.sendCourseAccessEmail).toHaveBeenCalledOnce();
    const assignments = await database.db
      .select()
      .from(database.employeeCourse)
      .where(database.eq(database.employeeCourse.employeeId, employeeId));
    expect(assignments).toHaveLength(0);
    const completedAt = '2026-10-20T00:00:00.000Z';
    await database.db
      .update(database.groupmember)
      .set({ completedAt })
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    await services.enrollInternalLearner(organizationId, course.id, user);
    const [member] = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(new Date(member.completedAt!).toISOString()).toBe(completedAt);
    expect(email.sendCourseAccessEmail).toHaveBeenCalledOnce();
  });

  it('denies inactive employees, deactivated memberships and outsiders', async () => {
    const course = await createCourse();
    await database.db
      .update(database.employee)
      .set({ status: 'SUSPENDED' })
      .where(database.eq(database.employee.id, employeeId));
    await expect(services.listCourseLibrary(organizationId, profileId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      services.enrollInternalLearner(organizationId, course.id, { id: profileId, email: userEmail })
    ).rejects.toMatchObject({ statusCode: 403 });
    await database.db
      .update(database.employee)
      .set({ status: 'ACTIVE' })
      .where(database.eq(database.employee.id, employeeId));
    await database.db
      .update(database.organizationmember)
      .set({ status: 'DEACTIVATED' })
      .where(database.eq(database.organizationmember.id, memberId));
    await expect(services.listCourseLibrary(organizationId, profileId)).rejects.toMatchObject({ statusCode: 403 });
    await expect(services.listCourseLibrary(organizationId, randomUUID())).rejects.toMatchObject({ statusCode: 403 });
  });

  it('does not claim enrollment when a legacy pending member owns the email', async () => {
    const course = await createCourse();
    await database.db.insert(database.groupmember).values({ groupId: course.groupId!, email: userEmail, roleId: 3 });
    await expect(
      services.enrollInternalLearner(organizationId, course.id, { id: profileId, email: userEmail })
    ).rejects.toMatchObject({ statusCode: 409 });
    const members = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(members).toHaveLength(1);
    expect(members[0].profileId).toBeNull();
    expect(email.sendCourseAccessEmail).not.toHaveBeenCalled();
  });

  it('does not self-enroll compliance or newly closed courses', async () => {
    const compliance = await createCourse({ type: 'COMPLIANCE' });
    const course = await createCourse();
    const user = { id: profileId, email: userEmail };
    await expect(services.getCourseLibraryDetails(organizationId, profileId, compliance.id)).rejects.toMatchObject({
      statusCode: 404
    });
    await expect(services.enrollInternalLearner(organizationId, compliance.id, user)).rejects.toMatchObject({
      statusCode: 404
    });
    await database.db
      .update(database.course)
      .set({ metadata: { showInLibrary: true, allowSelfEnrollment: false } })
      .where(database.eq(database.course.id, course.id));
    await expect(services.enrollInternalLearner(organizationId, course.id, user)).rejects.toMatchObject({
      statusCode: 404
    });
  });

  it('creates private defaults even when copying open metadata', async () => {
    const course = await createCourse();
    const [created] = await queries.createCourse({
      title: 'Copied course',
      description: 'Copied',
      groupId: course.groupId,
      metadata: { showInLibrary: true, allowSelfEnrollment: true, goals: 'Preserved goals' }
    });
    expect(created.metadata).toMatchObject({
      allowSelfEnrollment: false,
      goals: 'Preserved goals'
    });
  });

  it('uses the same filtered count for pagination and literal search characters', async () => {
    for (let index = 0; index < 4; index += 1) await createCourse({ title: `Literal %_ ${index}` });
    await createCourse({ title: 'Other course' });
    const result = await services.listCourseLibrary(organizationId, profileId, { search: '%_', page: 2, limit: 2 });
    expect(result.total).toBe(4);
    expect(result.data).toHaveLength(2);
    expect(result.data.every((course) => course.title.includes('%_'))).toBe(true);
  });
});

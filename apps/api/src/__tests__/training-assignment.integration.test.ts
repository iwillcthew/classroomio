import { randomUUID } from 'node:crypto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn(), emit: vi.fn() }));
vi.mock('@api/services/course/employees', () => ({ sendCourseAccessEmail: mocks.sendEmail }));
vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: vi.fn() }));
vi.mock('@cio/core/services/webhook/emit', () => ({
  buildMemberSource: (method: string) => ({ method }),
  emitCourseMemberAddedWebhookEvent: mocks.emit,
  emitCourseWebhookEvent: vi.fn()
}));
vi.mock('@api/services/product-events', () => ({ captureLearnersEnrolled: vi.fn() }));
vi.mock('@api/services/course/compliance', () => ({
  ensureComplianceEnrollmentRecordsForProfiles: vi.fn(async () => ({ createdRecords: [] })),
  emitComplianceEnrollmentEvents: vi.fn()
}));

const databaseUrl = process.env.COURSE_LIBRARY_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('internal training assignments on isolated PostgreSQL', () => {
  let database: typeof import('@cio/db/drizzle');
  let assignments: typeof import('@api/services/course/training-assignment');
  let library: typeof import('@api/services/course/library');
  let access: typeof import('@cio/db/queries/course/learning-access');
  let courseQueries: typeof import('@cio/db/queries/course');
  let groupQueries: typeof import('@cio/db/queries/group');
  let organizationId: string;
  let learnerId: string;
  let actorId: string;
  let employeeId: string;
  let email: string;

  beforeAll(async () => {
    const databaseName = new URL(databaseUrl!).pathname.slice(1);
    if (!databaseName.endsWith('_test')) throw new Error('An isolated test database is required');

    process.env.DATABASE_URL = databaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== databaseName) throw new Error('Unexpected database');

    assignments = await import('@api/services/course/training-assignment');
    library = await import('@api/services/course/library');
    access = await import('@cio/db/queries/course/learning-access');
    courseQueries = await import('@cio/db/queries/course');
    groupQueries = await import('@cio/db/queries/group');
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
    mocks.sendEmail.mockResolvedValue(undefined);
    organizationId = randomUUID();
    learnerId = randomUUID();
    actorId = randomUUID();
    email = `${learnerId}@example.com`;
    await database.db.insert(database.organization).values({ id: organizationId, name: 'Training tests' });
    for (const profileId of [actorId, learnerId]) {
      const userEmail = `${profileId}@example.com`;
      await database.db
        .insert(database.user)
        .values({ id: profileId, name: profileId, email: userEmail, emailVerified: true });
      await database.db
        .insert(database.profile)
        .values({ id: profileId, username: profileId, fullname: profileId, email: userEmail });
    }
    await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId: actorId, roleId: 1, status: 'ACTIVE' });
    const [member] = await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId: learnerId, email, roleId: 3, status: 'ACTIVE' })
      .returning();
    const [employee] = await database.db
      .insert(database.employee)
      .values({
        organizationId,
        memberId: member.id,
        fullname: 'Learner',
        email,
        employeeCode: learnerId.toUpperCase(),
        status: 'ACTIVE',
        activatedAt: new Date().toISOString()
      })
      .returning();
    employeeId = employee.id;
  });

  async function createCourse(overrides: Partial<typeof database.course.$inferInsert> = {}) {
    const [group] = await database.db
      .insert(database.group)
      .values({ organizationId, name: 'Training group' })
      .returning();
    const [course] = await database.db
      .insert(database.course)
      .values({
        title: 'Training',
        description: 'Training',
        groupId: group.id,
        isPublished: true,
        metadata: { allowSelfEnrollment: true },
        ...overrides
      })
      .returning();
    return course;
  }

  function payload(overrides: Partial<Parameters<typeof assignments.assignCourseTraining>[2]> = {}) {
    return {
      profileIds: [learnerId],
      required: true,
      dueDate: '2030-01-01T00:00:00.000Z',
      message: '',
      sendEmail: true,
      ...overrides
    };
  }

  it('keeps self-service participation out of employee assignments and mandatory reports', async () => {
    const course = await createCourse();
    await library.enrollInternalLearner(organizationId, course.id, { id: learnerId, email });
    const contexts = await access.getLearningContexts(organizationId, { profileIds: [learnerId] });
    expect(contexts.map((context) => context.kind)).toEqual(['SELF']);
    const selected = await database.db
      .select()
      .from(database.employeeCourse)
      .where(database.eq(database.employeeCourse.employeeId, employeeId));
    expect(selected).toEqual([]);
    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning[0]).toMatchObject({
      isSelfEnrolled: true,
      isAssigned: false,
      isRequired: false,
      learningDueDate: null
    });
    const { getLearningAnalyticsSnapshot } = await import('@cio/db/queries/dash');
    expect((await getLearningAnalyticsSnapshot(organizationId)).assignments).toBe(0);
  });

  it('assigns an existing self-selected course without resetting work and preserves the first deadline on retries', async () => {
    const course = await createCourse();
    await library.enrollInternalLearner(organizationId, course.id, { id: learnerId, email });
    const completedAt = '2026-10-01T00:00:00.000Z';
    await database.db
      .update(database.groupmember)
      .set({ completedAt })
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    mocks.sendEmail.mockClear();
    const first = await assignments.assignCourseTraining(course.id, actorId, payload());
    const repeated = await assignments.assignCourseTraining(
      course.id,
      actorId,
      payload({ dueDate: '2031-01-01T00:00:00.000Z' })
    );
    expect(first).toEqual({ assigned: 1, existing: 0 });
    expect(repeated).toEqual({ assigned: 0, existing: 1 });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    const contexts = await access.getLearningContexts(organizationId, { profileIds: [learnerId] });
    expect(contexts.map((context) => context.kind).sort()).toEqual(['DIRECT', 'SELF']);
    const direct = contexts.find((context) => context.kind === 'DIRECT')!;
    expect(new Date(direct.dueDate!).toISOString()).toBe('2030-01-01T00:00:00.000Z');
    expect(direct.assignedBy).toBe(actorId);
    const [member] = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(new Date(member.completedAt!).toISOString()).toBe(completedAt);
  });

  it('serializes concurrent assignment and delivers one notification', async () => {
    const course = await createCourse();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => assignments.assignCourseTraining(course.id, actorId, payload()))
    );
    expect(results.reduce((total, result) => total + result.assigned, 0)).toBe(1);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    const contexts = await access.getLearningContexts(organizationId, { profileIds: [learnerId] });
    expect(contexts).toHaveLength(1);
  });

  it('cancels only the direct source, retaining self-selection and historical work', async () => {
    const course = await createCourse();
    await library.enrollInternalLearner(organizationId, course.id, { id: learnerId, email });
    await assignments.assignCourseTraining(course.id, actorId, payload());
    const contexts = await access.getLearningContexts(organizationId, { courseIds: [course.id] });
    const source = contexts.find((context) => context.kind === 'DIRECT')!;
    await assignments.cancelCourseSource(course.id, source.sourceId, actorId);
    expect(await groupQueries.isUserCourseMemberOrOrgAdmin(course.id, learnerId)).toBe(true);
    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning[0]).toMatchObject({ isAssigned: false, isSelfEnrolled: true, isRequired: false });
    expect(learning[0].learningSources?.find((context) => context.kind === 'DIRECT')?.revokedAt).toBeTruthy();
  });

  it('revokes effective access without deleting the identity and allows a later fresh assignment', async () => {
    const course = await createCourse({ metadata: { allowSelfEnrollment: false } });
    await assignments.assignCourseTraining(course.id, actorId, payload());
    const [source] = await access.getLearningContexts(organizationId, { courseIds: [course.id] });
    await assignments.cancelCourseSource(course.id, source.sourceId, actorId);
    expect(await groupQueries.isUserCourseMemberOrOrgAdmin(course.id, learnerId)).toBe(false);
    expect(await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId })).toEqual([]);
    const cards = await courseQueries.getOrgCourses({ orgId: organizationId });
    expect(cards.items.find((entry) => entry.id === course.id)?.totalStudents).toBe(0);
    const members = await database.db
      .select()
      .from(database.groupmember)
      .where(database.eq(database.groupmember.groupId, course.groupId!));
    expect(members).toHaveLength(1);
    await assignments.assignCourseTraining(course.id, actorId, payload());
    const history = await access.getLearningContexts(organizationId, { courseIds: [course.id] });
    expect(history).toHaveLength(2);
    expect(history.filter((context) => !context.revokedAt)).toHaveLength(1);
  });

  it('supports recommended assignments without counting them as mandatory', async () => {
    const course = await createCourse();
    await assignments.assignCourseTraining(course.id, actorId, payload({ required: false }));
    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning[0]).toMatchObject({ isAssigned: true, isRequired: false, learningDueDate: null });
  });

  it('rejects inactive and cross-organization recipients atomically', async () => {
    const course = await createCourse();
    await expect(
      assignments.assignCourseTraining(course.id, actorId, payload({ profileIds: [learnerId, randomUUID()] }))
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(await access.getLearningContexts(organizationId, { courseIds: [course.id] })).toEqual([]);
    await database.db
      .update(database.employee)
      .set({ status: 'SUSPENDED' })
      .where(database.eq(database.employee.id, employeeId));
    await expect(assignments.assignCourseTraining(course.id, actorId, payload())).rejects.toMatchObject({
      statusCode: 400
    });
    expect(await access.getLearningContexts(organizationId, { courseIds: [course.id] })).toEqual([]);
  });

  it('does not roll back committed assignments when notification fails or resend on retries', async () => {
    const course = await createCourse();
    mocks.sendEmail.mockRejectedValueOnce(new Error('Mail unavailable'));
    expect(await assignments.assignCourseTraining(course.id, actorId, payload())).toMatchObject({ assigned: 1 });
    expect(await assignments.assignCourseTraining(course.id, actorId, payload())).toMatchObject({ existing: 1 });
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });

  it('keeps program and cohort access contextual and does not make an N-of-M goal require every course', async () => {
    const course = await createCourse({ metadata: { allowSelfEnrollment: false } });
    const [cohort] = await database.db.insert(database.cohort).values({ organizationId, name: 'Cohort' }).returning();
    const [member] = await database.db
      .insert(database.cohortMember)
      .values({ cohortId: cohort.id, profileId: learnerId, roleId: 3 })
      .returning();
    await database.db.insert(database.cohortCourse).values({ cohortId: cohort.id, courseId: course.id });
    const [goal] = await database.db
      .insert(database.cohortGoal)
      .values({ cohortId: cohort.id, title: 'Choose one', type: 'n_of_m', courseIds: [course.id], requiredCount: 1 })
      .returning();
    await database.db
      .insert(database.cohortGoalAssignment)
      .values({ goalId: goal.id, cohortMemberId: member.id, dueDate: '2030-01-01T00:00:00.000Z' });
    await access.materializeCourseLearners(course.id);
    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning[0]).toMatchObject({ isAssigned: true, isRequired: false });
    await database.db
      .update(database.cohortGoal)
      .set({ type: 'complete_all' })
      .where(database.eq(database.cohortGoal.id, goal.id));
    await database.db.delete(database.groupmember).where(database.eq(database.groupmember.groupId, course.groupId!));
    const { getLearningAnalyticsSnapshot } = await import('@cio/db/queries/dash');
    expect((await getLearningAnalyticsSnapshot(organizationId)).assignments).toBe(1);
    const cards = await courseQueries.getOrgCourses({ orgId: organizationId });
    expect(cards.items.find((entry) => entry.id === course.id)?.totalStudents).toBe(1);
    const { getCourseStats } = await import('@cio/db/queries/dash');
    expect((await getCourseStats(organizationId)).find((entry) => entry.courseId === course.id)?.totalStudents).toBe(1);
    expect(
      (await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId }))[0].isRequired
    ).toBe(true);
    await database.db.delete(database.cohortCourse).where(database.eq(database.cohortCourse.courseId, course.id));
    expect(await groupQueries.isUserCourseMemberOrOrgAdmin(course.id, learnerId)).toBe(false);
  });

  it('keeps legacy access explicitly unknown and teaching staff out of My Learning', async () => {
    const legacy = await createCourse();
    const teaching = await createCourse();
    await database.db.insert(database.groupmember).values([
      { groupId: legacy.groupId!, profileId: learnerId, email, roleId: 3 },
      { groupId: teaching.groupId!, profileId: learnerId, email, roleId: 2 }
    ]);
    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning.map((course) => course.id)).toEqual([legacy.id]);
    expect(learning[0].learningSources?.[0].kind).toBe('LEGACY');
    expect(learning[0].isRequired).toBe(false);
    const compliance = await createCourse({ type: 'COMPLIANCE' });
    await database.db
      .insert(database.groupmember)
      .values({ groupId: compliance.groupId!, profileId: learnerId, email, roleId: 3 });
    const withLegacyCompliance = await courseQueries.getEnrolledCourses({
      orgId: organizationId,
      profileId: learnerId
    });
    expect(withLegacyCompliance.find((entry) => entry.id === compliance.id)?.isRequired).toBe(false);
  });

  it('rolls back an earlier source if a later learner has a conflicting teaching identity', async () => {
    const course = await createCourse();
    const secondId = randomUUID();
    const secondEmail = `${secondId}@example.com`;
    await database.db
      .update(database.employee)
      .set({ employeeCode: 'AAA' })
      .where(database.eq(database.employee.id, employeeId));
    await database.db.insert(database.user).values({ id: secondId, name: 'Second', email: secondEmail });
    await database.db
      .insert(database.profile)
      .values({ id: secondId, username: secondId, fullname: 'Second', email: secondEmail });
    const [member] = await database.db
      .insert(database.organizationmember)
      .values({ organizationId, profileId: secondId, roleId: 3 })
      .returning();
    await database.db.insert(database.employee).values({
      organizationId,
      memberId: member.id,
      employeeCode: 'ZZZ',
      fullname: 'Second',
      email: secondEmail,
      status: 'ACTIVE'
    });
    await database.db
      .insert(database.groupmember)
      .values({ groupId: course.groupId!, profileId: secondId, email: secondEmail, roleId: 2 });
    await expect(
      assignments.assignCourseTraining(course.id, actorId, payload({ profileIds: [learnerId, secondId] }))
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(await access.getLearningContexts(organizationId, { courseIds: [course.id] })).toEqual([]);
    const learners = await database.db
      .select()
      .from(database.groupmember)
      .where(
        database.and(
          database.eq(database.groupmember.groupId, course.groupId!),
          database.eq(database.groupmember.roleId, 3)
        )
      );
    expect(learners).toEqual([]);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('preserves compliance cycles and requires compliance controls for cancellation', async () => {
    const course = await createCourse({ type: 'COMPLIANCE' });
    const member = await access.ensureLearnerMembership(course.groupId!, learnerId, email);
    const [record] = await database.db
      .insert(database.courseCompletionRecord)
      .values({
        courseId: course.id,
        profileId: learnerId,
        groupMemberId: member!.id,
        cycleNumber: 2,
        status: 'in_progress',
        dueDate: '2030-02-01T00:00:00.000Z',
        attempts: 3
      })
      .returning();
    await expect(assignments.assignCourseTraining(course.id, actorId, payload())).rejects.toMatchObject({
      statusCode: 400
    });
    await assignments.assignCourseTraining(course.id, actorId, payload({ dueDate: null }));
    const [source] = await access.getLearningContexts(organizationId, { courseIds: [course.id] });
    await expect(assignments.cancelCourseSource(course.id, source.sourceId, actorId)).rejects.toMatchObject({
      statusCode: 409
    });
    const records = await database.db
      .select()
      .from(database.courseCompletionRecord)
      .where(database.eq(database.courseCompletionRecord.courseId, course.id));
    expect(records).toEqual([record]);
    expect((await library.listCourseLibrary(organizationId, learnerId)).total).toBe(0);
  });

  it('keeps draft publication independent of assignment and retains obligations when unpublished', async () => {
    const course = await createCourse({ isPublished: false, metadata: { allowSelfEnrollment: false } });
    await assignments.assignCourseTraining(course.id, actorId, payload());
    expect(await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId })).toEqual([]);
    await database.db
      .update(database.course)
      .set({ isPublished: true })
      .where(database.eq(database.course.id, course.id));
    expect((await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId }))[0]).toMatchObject({
      isAssigned: true,
      isRequired: true
    });
    expect((await library.listCourseLibrary(organizationId, learnerId)).total).toBe(0);
    await database.db
      .update(database.course)
      .set({ isPublished: false })
      .where(database.eq(database.course.id, course.id));
    expect((await access.getLearningContexts(organizationId, { courseIds: [course.id] }))[0].required).toBe(true);
  });

  it('retains access from a formal compliance cycle after cohort access ends', async () => {
    const course = await createCourse({ type: 'COMPLIANCE', metadata: { allowSelfEnrollment: false } });
    const [cohort] = await database.db
      .insert(database.cohort)
      .values({ organizationId, name: 'Compliance cohort' })
      .returning();
    await database.db.insert(database.cohortCourse).values({ cohortId: cohort.id, courseId: course.id });
    await database.db.insert(database.cohortMember).values({ cohortId: cohort.id, profileId: learnerId, roleId: 3 });
    const member = await access.ensureLearnerMembership(course.groupId!, learnerId, email);
    await database.db.insert(database.courseCompletionRecord).values({
      courseId: course.id,
      profileId: learnerId,
      groupMemberId: member!.id,
      status: 'in_progress',
      dueDate: '2030-01-01T00:00:00.000Z'
    });
    await database.db.delete(database.cohortCourse).where(database.eq(database.cohortCourse.courseId, course.id));
    const learning = await courseQueries.getEnrolledCourses({ orgId: organizationId, profileId: learnerId });
    expect(learning[0]).toMatchObject({ isAssigned: true, isRequired: true });
    expect(learning[0].learningSources?.map((source) => source.kind)).toEqual(['COMPLIANCE']);
    expect(await groupQueries.isUserCourseMemberOrOrgAdmin(course.id, learnerId)).toBe(true);
    const { getStudentCourseMembersForCompliance } = await import('@cio/db/queries/course/compliance');
    expect(await getStudentCourseMembersForCompliance(course.id, [])).toEqual([]);
  });
});

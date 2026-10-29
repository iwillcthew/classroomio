import { createEnrollmentSource, createTrainingAssignment } from '@cio/db/queries/course/learning-access';
import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@cio/db/drizzle';
import * as schema from '@cio/db/schema';
import { eq } from 'drizzle-orm';
import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash/learning-analytics';

type TestTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function withRollback(run: (transaction: TestTransaction) => Promise<void>) {
  const rollback = new Error('ROLLBACK_ANALYTICS_TEST');
  try {
    await db.transaction(async (transaction) => {
      await run(transaction);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function createPopulation(transaction: TestTransaction) {
  await transaction.insert(schema.submissionstatus).values({ id: 1, label: 'Submitted' }).onConflictDoNothing();
  const profiles = await transaction.select({ id: schema.profile.id }).from(schema.profile).limit(2);
  if (profiles.length !== 2) throw new Error('Analytics integration tests require two local test profiles');

  const siteName = `analytics-test-${randomUUID()}`;
  const [organization] = await transaction
    .insert(schema.organization)
    .values({ name: 'Analytics integration', siteName })
    .returning();
  await transaction
    .insert(schema.organizationmember)
    .values(profiles.map((profile) => ({ organizationId: organization.id, profileId: profile.id, roleId: 3 })));
  return { organizationId: organization.id, profileId: profiles[0].id };
}

async function createCourse(
  transaction: TestTransaction,
  organizationId: string,
  profileId: string,
  type: 'SELF_PACED' | 'COMPLIANCE' = 'SELF_PACED'
) {
  const [group] = await transaction
    .insert(schema.group)
    .values({ name: 'Analytics test course', organizationId })
    .returning();
  const [course] = await transaction
    .insert(schema.course)
    .values({ title: 'Analytics test course', description: '', groupId: group.id, type, isPublished: true })
    .returning();
  const [member] = await transaction
    .insert(schema.groupmember)
    .values({ groupId: group.id, profileId, roleId: 3 })
    .returning();
  const enrollment = await createEnrollmentSource(course.id, profileId, 'DIRECT', transaction);
  await createTrainingAssignment(
    enrollment.source.id,
    { assignedBy: null, required: true, dueDate: null, message: '' },
    transaction
  );
  return { courseId: course.id, memberId: member.id };
}

describe.skipIf(process.env.MP_ANALYTICS_DB_TESTS !== 'true')('internal learning analytics database', () => {
  it('isolates organizations and returns no fabricated completion percentage for an empty population', async () => {
    const snapshot = await getLearningAnalyticsSnapshot(randomUUID());
    expect(snapshot.employees).toBe(0);
    expect(snapshot.assignments).toBe(0);
    expect(snapshot.courses).toEqual([]);
    expect(snapshot.attention).toEqual([]);
  });

  it('honors exercise pass requirements, counts attempts once for progress, and does not complete empty courses', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, profileId);
      const [lesson] = await transaction
        .insert(schema.lesson)
        .values({ title: 'Lesson', slug: 'lesson', courseId, order: 0 })
        .returning();
      const [exercise] = await transaction
        .insert(schema.exercise)
        .values({
          title: 'Assessment',
          courseId,
          order: 1,
          slug: 'assessment',
          completionPolicy: 'passed',
          passThreshold: 100
        })
        .returning();
      const [questionType] = await transaction
        .insert(schema.questionType)
        .values({ label: 'Analytics test' })
        .returning();
      await transaction
        .insert(schema.question)
        .values({ exerciseId: exercise.id, questionTypeId: questionType.id, title: 'Question', points: 10 });
      await transaction.insert(schema.lessonCompletion).values({ lessonId: lesson.id, profileId, isComplete: true });
      await transaction
        .insert(schema.submission)
        .values({ exerciseId: exercise.id, submittedBy: memberId, gradingState: 'completed', total: 5 });
      const pending = await getLearningAnalyticsSnapshot(organizationId, transaction);
      expect(pending.assignments).toBe(1);
      expect(pending.completed).toBe(0);
      expect(pending.inProgress).toBe(1);
      expect(pending.courses[0].progress).toBe(50);
      await transaction
        .insert(schema.submission)
        .values({ exerciseId: exercise.id, submittedBy: memberId, gradingState: 'completed', total: 10 });
      const emptyCourse = await createCourse(transaction, organizationId, profileId);
      const completed = await getLearningAnalyticsSnapshot(organizationId, transaction);
      expect(completed.employees).toBe(2);
      expect(completed.enrolledEmployees).toBe(1);
      expect(completed.assignments).toBe(2);
      expect(completed.completed).toBe(1);
      expect(completed.notStarted).toBe(1);
      expect(completed.courses.find((course) => course.id === courseId)?.progress).toBe(100);
      expect(completed.courses.find((course) => course.id === emptyCourse.courseId)?.completed).toBe(0);
      expect(completed.attention.some((employee) => employee.assigned === 0)).toBe(true);
      await transaction
        .update(schema.course)
        .set({ isTemplate: true })
        .where(eq(schema.course.id, emptyCourse.courseId));
      const withoutTemplate = await getLearningAnalyticsSnapshot(organizationId, transaction);
      expect(withoutTemplate.courses).toHaveLength(1);
    });
  });

  it('uses the latest compliance cycle and excludes inactive employees', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, profileId, 'COMPLIANCE');
      const dueDate = new Date(Date.now() - 86400000).toISOString();
      await transaction.insert(schema.courseCompletionRecord).values([
        { courseId, profileId, groupMemberId: memberId, cycleNumber: 1, status: 'compliant', dueDate },
        { courseId, profileId, groupMemberId: memberId, cycleNumber: 2, status: 'non_compliant', dueDate }
      ]);
      const overdue = await getLearningAnalyticsSnapshot(organizationId, transaction);
      expect(overdue.overdue).toBe(1);
      expect(overdue.completed).toBe(0);
      await transaction
        .insert(schema.courseCompletionRecord)
        .values({ courseId, profileId, groupMemberId: memberId, cycleNumber: 3, status: 'waived', dueDate });
      const waived = await getLearningAnalyticsSnapshot(organizationId, transaction);
      expect(waived.overdue).toBe(0);
      expect(waived.completed).toBe(1);
      await transaction
        .update(schema.organizationmember)
        .set({ status: 'DEACTIVATED' })
        .where(eq(schema.organizationmember.organizationId, organizationId));
      const inactive = await getLearningAnalyticsSnapshot(organizationId, transaction);
      expect(inactive.employees).toBe(0);
      expect(inactive.assignments).toBe(0);
    });
  });

  it('buckets learning in Vietnam time, counts submission attempts, and excludes future/out-of-period events', async () => {
    await withRollback(async (transaction) => {
      const { organizationId, profileId } = await createPopulation(transaction);
      const { courseId, memberId } = await createCourse(transaction, organizationId, profileId);
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      const firstDayStart = new Date(`${today}T00:00:00+07:00`).getTime() - 6 * 86400000;
      const inside = new Date(firstDayStart + 1800000).toISOString();
      const outside = new Date(firstDayStart - 1800000).toISOString();
      const future = new Date(Date.now() + 86400000).toISOString();
      const lessons = await transaction
        .insert(schema.lesson)
        .values([
          { title: 'Inside', slug: 'inside', courseId, order: 0 },
          { title: 'Outside', slug: 'outside', courseId, order: 1 },
          { title: 'Future', slug: 'future', courseId, order: 2 }
        ])
        .returning();
      await transaction.insert(schema.lessonCompletion).values([
        { lessonId: lessons[0].id, profileId, isComplete: true, createdAt: inside, updatedAt: inside },
        { lessonId: lessons[1].id, profileId, isComplete: true, createdAt: outside, updatedAt: outside },
        { lessonId: lessons[2].id, profileId, isComplete: true, createdAt: future, updatedAt: future }
      ]);
      const [exercise] = await transaction
        .insert(schema.exercise)
        .values({ title: 'Legacy lesson exercise', lessonId: lessons[0].id, order: 3, slug: 'legacy' })
        .returning();
      await transaction.insert(schema.submission).values([
        { exerciseId: exercise.id, submittedBy: memberId, createdAt: inside },
        { exerciseId: exercise.id, submittedBy: memberId, createdAt: inside }
      ]);
      const activity = await getLearningAnalyticsActivity(organizationId, 7, transaction);
      expect(activity.activeLearners).toBe(1);
      expect(activity.lessonsCompleted).toBe(1);
      expect(activity.submissions).toBe(2);
      expect(activity.daily).toHaveLength(7);
      expect(activity.daily[0].lessons).toBe(1);
      expect(activity.daily[0].submissions).toBe(2);
      const longerPeriod = await getLearningAnalyticsActivity(organizationId, 30, transaction);
      expect(longerPeriod.lessonsCompleted).toBe(2);
    });
  });
});

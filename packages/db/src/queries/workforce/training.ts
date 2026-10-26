import { and, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';
import type { TLearningPath, TTrainingRule } from '@cio/utils/validation/organization';
import { isExerciseCompletedSql, submissionMeetsCompletionPolicySql } from '@db/queries/course/progression';

export async function getWorkforceTrainingCatalog(organizationId: string, client: DbOrTxClient = db) {
  const courses = await client
    .select({ id: schema.course.id, title: schema.course.title, groupId: schema.course.groupId })
    .from(schema.course)
    .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
    .where(eq(schema.group.organizationId, organizationId));
  const exams = await client
    .select({ id: schema.exercise.id, title: schema.exercise.title, courseId: schema.exercise.courseId })
    .from(schema.exercise)
    .innerJoin(schema.course, eq(schema.course.id, schema.exercise.courseId))
    .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
    .where(eq(schema.group.organizationId, organizationId));
  const paths = await client
    .select()
    .from(schema.workforceLearningPath)
    .where(eq(schema.workforceLearningPath.organizationId, organizationId));
  const pathCourses = paths.length
    ? await client
        .select()
        .from(schema.workforcePathCourse)
        .where(
          inArray(
            schema.workforcePathCourse.pathId,
            paths.map((path) => path.id)
          )
        )
        .orderBy(schema.workforcePathCourse.position)
    : [];
  const rules = await client
    .select()
    .from(schema.workforceTrainingRule)
    .where(eq(schema.workforceTrainingRule.organizationId, organizationId));
  const targets = rules.length
    ? await client
        .select()
        .from(schema.workforceRuleTarget)
        .where(
          inArray(
            schema.workforceRuleTarget.ruleId,
            rules.map((rule) => rule.id)
          )
        )
    : [];
  return { courses, exams, paths, pathCourses, rules, targets };
}

export async function saveWorkforceTrainingRule(
  organizationId: string,
  data: TTrainingRule,
  resourceId: string | undefined,
  client: DbOrTxClient
) {
  const values = {
    organizationId,
    name: data.name,
    unitId: data.unitId,
    jobTitleId: data.jobTitleId,
    enabled: data.enabled
  };
  const rows = resourceId
    ? await client
        .update(schema.workforceTrainingRule)
        .set(values)
        .where(
          and(
            eq(schema.workforceTrainingRule.id, resourceId),
            eq(schema.workforceTrainingRule.organizationId, organizationId)
          )
        )
        .returning()
    : await client.insert(schema.workforceTrainingRule).values(values).returning();
  const rule = rows[0];
  if (!rule) return null;

  await client.delete(schema.workforceRuleTarget).where(eq(schema.workforceRuleTarget.ruleId, rule.id));
  const targets = [
    ...data.courseIds.map((courseId) => ({ ruleId: rule.id, courseId })),
    ...data.examIds.map((examId) => ({ ruleId: rule.id, examId })),
    ...data.pathIds.map((pathId) => ({ ruleId: rule.id, pathId }))
  ];
  await client.insert(schema.workforceRuleTarget).values(targets);
  return rule;
}

export async function saveWorkforceLearningPath(
  organizationId: string,
  data: TLearningPath,
  resourceId: string | undefined,
  client: DbOrTxClient
) {
  const values = { organizationId, name: data.name, jobTitleId: data.jobTitleId };
  const rows = resourceId
    ? await client
        .update(schema.workforceLearningPath)
        .set(values)
        .where(
          and(
            eq(schema.workforceLearningPath.id, resourceId),
            eq(schema.workforceLearningPath.organizationId, organizationId)
          )
        )
        .returning()
    : await client.insert(schema.workforceLearningPath).values(values).returning();
  const path = rows[0];
  if (!path) return null;

  await client.delete(schema.workforcePathCourse).where(eq(schema.workforcePathCourse.pathId, path.id));
  const courses = data.courseIds.map((courseId, position) => ({ pathId: path.id, courseId, position }));
  await client.insert(schema.workforcePathCourse).values(courses);
  return path;
}

export async function insertWorkforceAssignment(
  values: typeof schema.workforceAssignment.$inferInsert,
  profileId: string,
  email: string,
  client: DbOrTxClient
) {
  await client.insert(schema.workforceAssignment).values(values).onConflictDoNothing();
  if (!values.courseId) return;

  await enrollWorkforceCourse(values.courseId, profileId, email, client);
}

export async function enrollWorkforceCourse(courseId: string, profileId: string, email: string, client: DbOrTxClient) {
  const [course] = await client
    .select({ groupId: schema.course.groupId })
    .from(schema.course)
    .where(eq(schema.course.id, courseId));
  if (!course?.groupId) throw new Error('Course has no enrollment group');

  const [existing] = await client
    .select()
    .from(schema.groupmember)
    .where(and(eq(schema.groupmember.groupId, course.groupId), sql`lower(${schema.groupmember.email}) = ${email}`));
  if (existing?.profileId && existing.profileId !== profileId)
    throw new Error('Enrollment is linked to another identity');

  if (existing) {
    await client.update(schema.groupmember).set({ profileId }).where(eq(schema.groupmember.id, existing.id));
    return;
  }

  await client
    .insert(schema.groupmember)
    .values({ groupId: course.groupId, profileId, email, roleId: 3 })
    .onConflictDoNothing();
}

export async function getWorkforceAssignedPaths(organizationId: string, client: DbOrTxClient) {
  return client
    .select({ employeeId: schema.workforceAssignment.employeeId, pathId: schema.workforceAssignment.pathId })
    .from(schema.workforceAssignment)
    .innerJoin(schema.workforceEmployee, eq(schema.workforceEmployee.id, schema.workforceAssignment.employeeId))
    .where(
      and(
        eq(schema.workforceEmployee.organizationId, organizationId),
        sql`${schema.workforceAssignment.pathId} is not null`
      )
    );
}

export async function getWorkforceAssignments(organizationId: string, scope?: SQL, client: DbOrTxClient = db) {
  const employeeProfileId = sql<string>`${schema.workforceEmployee.profileId}`;
  const exerciseCompleted = isExerciseCompletedSql('ex', { profileId: employeeProfileId });
  const contentCompleted = sql<boolean>`(
    exists (select 1 from ${schema.lesson} content_lesson where content_lesson.course_id = ${schema.workforceAssignment.courseId} and content_lesson.is_unlocked = true
      union all select 1 from ${schema.exercise} content_exercise where content_exercise.course_id = ${schema.workforceAssignment.courseId} and content_exercise.is_unlocked = true)
    and not exists (select 1 from ${schema.lesson} pending_lesson where pending_lesson.course_id = ${schema.workforceAssignment.courseId} and pending_lesson.is_unlocked = true
      and not exists (select 1 from ${schema.lessonCompletion} completion where completion.lesson_id = pending_lesson.id
        and completion.profile_id = ${schema.workforceEmployee.profileId} and completion.is_complete = true))
    and not exists (select 1 from ${schema.exercise} ex where ex.course_id = ${schema.workforceAssignment.courseId} and ex.is_unlocked = true and not ${exerciseCompleted})
  )`;
  return client
    .select({
      assignment: schema.workforceAssignment,
      employee: schema.workforceEmployee,
      courseTitle: schema.course.title,
      examTitle: schema.exercise.title,
      examCourseId: schema.exercise.courseId,
      pathName: schema.workforceLearningPath.name,
      fullname: schema.profile.fullname,
      complete: sql<boolean>`case when ${schema.workforceAssignment.courseId} is not null and ${schema.course.type} = 'COMPLIANCE' then coalesce((
        select (cr.status = 'compliant' and (cr.valid_until is null or cr.valid_until > now()))
          or (cr.status = 'waived' and (cr.waiver_expires_at is null or cr.waiver_expires_at > now()))
        from ${schema.courseCompletionRecord} cr where cr.course_id = ${schema.workforceAssignment.courseId}
          and cr.profile_id = ${schema.workforceEmployee.profileId} order by cr.cycle_number desc limit 1
      ), false) when ${schema.workforceAssignment.courseId} is not null then exists (
      select 1 from ${schema.courseCompletionRecord} cr where cr.course_id = ${schema.workforceAssignment.courseId}
      and cr.profile_id = ${schema.workforceEmployee.profileId} and cr.status = 'completed'
      and (cr.valid_until is null or cr.valid_until > now())
    ) or ${contentCompleted} or exists (select 1 from ${schema.groupmember} gm join ${schema.course} completed_course on completed_course.group_id = gm.group_id
      where completed_course.id = ${schema.workforceAssignment.courseId} and gm.profile_id = ${schema.workforceEmployee.profileId}
      and gm.certificate_earned_at is not null)
    when ${schema.workforceAssignment.examId} is not null then exists (
      select 1 from ${schema.submission} join ${schema.groupmember} on ${schema.groupmember.id} = ${schema.submission.submittedBy}
      where ${schema.submission.exerciseId} = ${schema.workforceAssignment.examId}
      and ${schema.groupmember.profileId} = ${schema.workforceEmployee.profileId}
      and ${submissionMeetsCompletionPolicySql('exercise', 'submission')}) else false end`
    })
    .from(schema.workforceAssignment)
    .innerJoin(schema.workforceEmployee, eq(schema.workforceEmployee.id, schema.workforceAssignment.employeeId))
    .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceEmployee.profileId))
    .leftJoin(schema.course, eq(schema.course.id, schema.workforceAssignment.courseId))
    .leftJoin(schema.exercise, eq(schema.exercise.id, schema.workforceAssignment.examId))
    .leftJoin(schema.workforceLearningPath, eq(schema.workforceLearningPath.id, schema.workforceAssignment.pathId))
    .where(and(eq(schema.workforceEmployee.organizationId, organizationId), scope));
}

export async function workforceProfileAccess(profileId: string, client: DbOrTxClient = db) {
  const [employee] = await client
    .select({ status: schema.workforceEmployee.status })
    .from(schema.workforceEmployee)
    .where(eq(schema.workforceEmployee.profileId, profileId));
  return !employee || employee.status === 'ACTIVE';
}

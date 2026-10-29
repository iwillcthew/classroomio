import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';

export function courseObligationsSql(courseId: string | SQL, profileId: string | SQL) {
  return sql`(
    select a.due_date from course_training_assignment a join course_enrollment_source s on s.id = a.enrollment_source_id
    where s.course_id = ${courseId} and s.profile_id = ${profileId} and s.revoked_at is null and a.required
    union all
    select cr.due_date from course co join lateral (
      select status, due_date from course_completion_record where course_id = co.id and profile_id = ${profileId}
      order by cycle_number desc limit 1
    ) cr on true where co.id = ${courseId} and co.type = 'COMPLIANCE' and coalesce(cr.status, '') <> 'waived'
    union all
    select ga.due_date from program_goal_assignment ga join program_goal g on g.id = ga.goal_id
    join program_member pm on pm.id = ga.program_member_id join program p on p.id = pm.program_id
    join program_course pc on pc.program_id = p.id and pc.course_id = ${courseId}
    join course co on co.id = pc.course_id join "group" cg on cg.id = co.group_id
    where pm.profile_id = ${profileId} and pm.role_id = 3 and p.status = 'ACTIVE'
      and p.organization_id = cg.organization_id and g.program_id = p.id
      and g.status = 'active' and ga.status <> 'waived' and g.type = 'complete_all'
      and (g.course_ids = '[]'::jsonb or g.course_ids ? pc.course_id::text)
    union all
    select ga.due_date from cohort_goal_assignment ga join cohort_goal g on g.id = ga.goal_id
    join cohort_member cm on cm.id = ga.cohort_member_id join cohort c on c.id = cm.cohort_id
    join cohort_course cc on cc.cohort_id = c.id and cc.course_id = ${courseId}
    join course co on co.id = cc.course_id join "group" cg on cg.id = co.group_id
    where cm.profile_id = ${profileId} and cm.role_id = 3 and c.status = 'ACTIVE'
      and c.organization_id = cg.organization_id and g.cohort_id = c.id
      and g.status = 'active' and ga.status <> 'waived' and g.type = 'complete_all'
      and (g.course_ids = '[]'::jsonb or g.course_ids ? cc.course_id::text)
  )`;
}

export function courseRequiredSql(courseId: string | SQL, profileId: string | SQL) {
  const obligations = courseObligationsSql(courseId, profileId);
  return sql<boolean>`exists (select 1 from ${obligations} obligation)`;
}

export function courseDeadlineSql(courseId: string | SQL, profileId: string | SQL) {
  const obligations = courseObligationsSql(courseId, profileId);
  return sql<string | null>`(select min(obligation.due_date) from ${obligations} obligation)`;
}

export function courseAssignedSql(courseId: string | SQL, profileId: string | SQL) {
  const required = courseRequiredSql(courseId, profileId);
  return sql<boolean>`(${required} or exists (select 1 from course_enrollment_source s
    where s.course_id = ${courseId} and s.profile_id = ${profileId} and s.kind = 'DIRECT' and s.revoked_at is null)
    or exists (select 1 from program_course pc join program p on p.id = pc.program_id
      join program_member pm on pm.program_id = p.id join course co on co.id = pc.course_id join "group" cg on cg.id = co.group_id
      where pc.course_id = ${courseId} and pm.profile_id = ${profileId} and pm.role_id = 3 and p.status = 'ACTIVE' and p.organization_id = cg.organization_id)
    or exists (select 1 from cohort_course cc join cohort c on c.id = cc.cohort_id
      join cohort_member cm on cm.cohort_id = c.id join course co on co.id = cc.course_id join "group" cg on cg.id = co.group_id
      where cc.course_id = ${courseId} and cm.profile_id = ${profileId} and cm.role_id = 3 and c.status = 'ACTIVE' and c.organization_id = cg.organization_id))`;
}

export async function ensureLearnerMembership(
  groupId: string,
  profileId: string,
  email: string,
  client: DbOrTxClient = db
) {
  const values = { groupId, profileId, email, roleId: 3, learningAccessManaged: true };
  const [inserted] = await client.insert(schema.groupmember).values(values).onConflictDoNothing().returning();
  if (inserted) return inserted;

  const [member] = await client
    .select()
    .from(schema.groupmember)
    .where(
      and(
        eq(schema.groupmember.groupId, groupId),
        eq(schema.groupmember.profileId, profileId),
        eq(schema.groupmember.roleId, 3)
      )
    );
  return member ?? null;
}

export function learningMembershipSql(courseId: string | SQL, groupId: string | SQL, profileId: string | SQL) {
  return sql<boolean>`(exists (
    select 1 from "group" identity_group join organizationmember identity_member on identity_member.organization_id = identity_group.organization_id
    where identity_group.id = ${groupId} and identity_member.profile_id = ${profileId} and identity_member.status = 'ACTIVE'
      and not exists (select 1 from employee identity_employee where identity_employee.member_id = identity_member.id and identity_employee.status <> 'ACTIVE')
  ) and (
    exists (select 1 from groupmember learning_member
      where learning_member.group_id = ${groupId} and learning_member.profile_id = ${profileId}
      and learning_member.role_id = 3 and (not learning_member.learning_access_managed or exists (
        select 1 from course_enrollment_source learning_source where learning_source.course_id = ${courseId}
        and learning_source.profile_id = ${profileId} and learning_source.revoked_at is null)))
    or exists (select 1 from program_course pc join program p on p.id = pc.program_id
      join program_member pm on pm.program_id = p.id
      join "group" cg on cg.id = ${groupId}
      where pc.course_id = ${courseId} and pm.profile_id = ${profileId} and pm.role_id = 3
      and p.status = 'ACTIVE' and p.organization_id = cg.organization_id)
    or exists (select 1 from cohort_course cc join cohort c on c.id = cc.cohort_id
      join cohort_member cm on cm.cohort_id = c.id
      join "group" cg on cg.id = ${groupId}
      where cc.course_id = ${courseId} and cm.profile_id = ${profileId} and cm.role_id = 3
      and c.status = 'ACTIVE' and c.organization_id = cg.organization_id)
    or exists (select 1 from course_completion_record cr join course co on co.id = cr.course_id
      where cr.course_id = ${courseId} and cr.profile_id = ${profileId} and co.type = 'COMPLIANCE'
      and cr.status <> 'waived' and cr.cycle_number = (select max(latest.cycle_number)
        from course_completion_record latest where latest.course_id = cr.course_id and latest.profile_id = cr.profile_id))
  ))`;
}

export function courseLearnerCountSql(courseId: string | SQL, groupId: string | SQL) {
  const membership = learningMembershipSql(courseId, groupId, sql`learners.profile_id`);
  return sql<number>`(select count(*)::int from (
    select gm.profile_id from groupmember gm where gm.group_id = ${groupId} and gm.role_id = 3
    union
    select pm.profile_id from program_course pc join program_member pm on pm.program_id = pc.program_id
      where pc.course_id = ${courseId} and pm.role_id = 3
    union
    select cm.profile_id from cohort_course cc join cohort_member cm on cm.cohort_id = cc.cohort_id
      where cc.course_id = ${courseId} and cm.role_id = 3
    union
    select cr.profile_id from course_completion_record cr where cr.course_id = ${courseId}
  ) learners where ${membership})`;
}

export async function createEnrollmentSource(
  courseId: string,
  profileId: string,
  kind: 'SELF' | 'DIRECT' | 'LEGACY',
  client: DbOrTxClient = db
) {
  const [created] = await client
    .insert(schema.courseEnrollmentSource)
    .values({ courseId, profileId, kind })
    .onConflictDoNothing()
    .returning();
  if (created) return { source: created, created: true };

  const [source] = await client
    .select()
    .from(schema.courseEnrollmentSource)
    .where(
      and(
        eq(schema.courseEnrollmentSource.courseId, courseId),
        eq(schema.courseEnrollmentSource.profileId, profileId),
        eq(schema.courseEnrollmentSource.kind, kind),
        isNull(schema.courseEnrollmentSource.revokedAt)
      )
    );
  return { source, created: false };
}

export async function createTrainingAssignment(
  enrollmentSourceId: string,
  fields: { assignedBy: string | null; required: boolean; dueDate: string | null; message: string },
  client: DbOrTxClient = db
): Promise<typeof schema.courseTrainingAssignment.$inferSelect | null> {
  if (client === db)
    return db.transaction((transaction) => createTrainingAssignment(enrollmentSourceId, fields, transaction));

  const values = { enrollmentSourceId, ...fields };
  const [assignment] = await client
    .insert(schema.courseTrainingAssignment)
    .values(values)
    .onConflictDoNothing()
    .returning();
  if (assignment) {
    await client.execute(sql`insert into employee_course(employee_id, course_id)
      select e.id, s.course_id from course_enrollment_source s join course co on co.id = s.course_id
      join "group" cg on cg.id = co.group_id
      join organizationmember om on om.profile_id = s.profile_id and om.organization_id = cg.organization_id
      join employee e on e.member_id = om.id and e.organization_id = cg.organization_id
      where s.id = ${enrollmentSourceId} and s.kind = 'DIRECT' on conflict do nothing`);
  }
  return assignment ?? null;
}

export async function revokeEnrollmentSource(
  courseId: string,
  sourceId: string,
  actorId: string,
  client: DbOrTxClient = db
): Promise<typeof schema.courseEnrollmentSource.$inferSelect | null> {
  if (client === db)
    return db.transaction((transaction) => revokeEnrollmentSource(courseId, sourceId, actorId, transaction));

  const [legacy] = await client
    .select({ groupId: schema.groupmember.groupId, profileId: schema.groupmember.profileId })
    .from(schema.groupmember)
    .innerJoin(schema.course, eq(schema.course.groupId, schema.groupmember.groupId))
    .where(
      and(
        eq(schema.course.id, courseId),
        eq(schema.groupmember.id, sourceId),
        eq(schema.groupmember.roleId, 3),
        eq(schema.groupmember.learningAccessManaged, false)
      )
    );
  if (legacy?.profileId) {
    const enrollment = await createEnrollmentSource(courseId, legacy.profileId, 'LEGACY', client);
    await markLearningMembershipManaged(legacy.groupId, legacy.profileId, client);
    sourceId = enrollment.source.id;
  }

  const [source] = await client
    .update(schema.courseEnrollmentSource)
    .set({ revokedAt: new Date().toISOString(), revokedBy: actorId })
    .where(
      and(
        eq(schema.courseEnrollmentSource.courseId, courseId),
        eq(schema.courseEnrollmentSource.id, sourceId),
        isNull(schema.courseEnrollmentSource.revokedAt)
      )
    )
    .returning();
  if (source?.kind === 'DIRECT') {
    await client.execute(sql`delete from employee_course ec using employee e, organizationmember om, course co, "group" cg
      where ec.employee_id = e.id and e.member_id = om.id and om.profile_id = ${source.profileId}
      and ec.course_id = ${courseId} and co.id = ec.course_id and cg.id = co.group_id
      and e.organization_id = cg.organization_id and om.organization_id = cg.organization_id`);
  }
  return source ?? null;
}

export async function getLearningContexts(
  organizationId: string,
  options: { profileIds?: string[]; courseIds?: string[] } = {},
  client: DbOrTxClient = db
) {
  if (options.profileIds?.length === 0 || options.courseIds?.length === 0) return [];

  const profileCondition = options.profileIds ? inArray(sql`context.profile_id`, options.profileIds) : sql`true`;
  const courseCondition = options.courseIds ? inArray(sql`context.course_id`, options.courseIds) : sql`true`;
  const rows = await client.execute<{
    course_id: string;
    profile_id: string;
    source_id: string;
    kind: 'SELF' | 'DIRECT' | 'LEGACY' | 'PROGRAM' | 'COHORT' | 'COMPLIANCE';
    name: string | null;
    required: boolean;
    due_date: string | null;
    assigned_by: string | null;
    message: string;
    created_at: string;
    revoked_at: string | null;
  }>(sql`select context.* from (
    select s.course_id, s.profile_id, s.id::text source_id, s.kind, actor.fullname name,
      coalesce(a.required, false) required, a.due_date, a.assigned_by, coalesce(a.message, '') message,
      s.created_at, s.revoked_at
    from course_enrollment_source s left join course_training_assignment a on a.enrollment_source_id = s.id
    left join profile actor on actor.id = a.assigned_by
    union all
    select c.id, gm.profile_id, gm.id::text, 'LEGACY', null, false, null, null, '', gm.created_at, null
    from groupmember gm join course c on c.group_id = gm.group_id
    where gm.role_id = 3 and gm.profile_id is not null and not gm.learning_access_managed
      and not exists (select 1 from course_enrollment_source s where s.course_id = c.id and s.profile_id = gm.profile_id and s.kind = 'LEGACY')
    union all
    select pc.course_id, pm.profile_id, p.id::text, 'PROGRAM', p.name, goals.required, goals.due_date, null, '', pm.created_at, null
    from program_course pc join program p on p.id = pc.program_id join program_member pm on pm.program_id = p.id
    join course c on c.id = pc.course_id join "group" cg on cg.id = c.group_id
    left join lateral (
      select count(*) > 0 required, min(ga.due_date) due_date from program_goal g
      join program_goal_assignment ga on ga.goal_id = g.id and ga.program_member_id = pm.id
      where g.program_id = p.id and g.status = 'active' and g.type = 'complete_all' and ga.status <> 'waived'
      and (g.course_ids = '[]'::jsonb or g.course_ids ? pc.course_id::text)
    ) goals on true
    where p.status = 'ACTIVE' and pm.role_id = 3 and pm.profile_id is not null and p.organization_id = cg.organization_id
    union all
    select cc.course_id, cm.profile_id, c.id::text, 'COHORT', c.name, goals.required, goals.due_date, null, '', cm.created_at, null
    from cohort_course cc join cohort c on c.id = cc.cohort_id join cohort_member cm on cm.cohort_id = c.id
    join course co on co.id = cc.course_id join "group" cg on cg.id = co.group_id
    left join lateral (
      select count(*) > 0 required, min(ga.due_date) due_date from cohort_goal g
      join cohort_goal_assignment ga on ga.goal_id = g.id and ga.cohort_member_id = cm.id
      where g.cohort_id = c.id and g.status = 'active' and g.type = 'complete_all' and ga.status <> 'waived'
      and (g.course_ids = '[]'::jsonb or g.course_ids ? cc.course_id::text)
    ) goals on true
    where c.status = 'ACTIVE' and cm.role_id = 3 and cm.profile_id is not null and c.organization_id = cg.organization_id
    union all
    select cr.course_id, cr.profile_id, cr.id::text, 'COMPLIANCE', null, true, cr.due_date, null, '', cr.created_at, null
    from course_completion_record cr join course co on co.id = cr.course_id
    where co.type = 'COMPLIANCE' and cr.status <> 'waived'
      and cr.cycle_number = (select max(latest.cycle_number) from course_completion_record latest
        where latest.course_id = cr.course_id and latest.profile_id = cr.profile_id)
  ) context join course scoped_course on scoped_course.id = context.course_id
    join "group" scoped_group on scoped_group.id = scoped_course.group_id
    where scoped_group.organization_id = ${organizationId} and ${profileCondition} and ${courseCondition}
    order by context.created_at, context.source_id`);
  return rows.map((row) => ({
    courseId: row.course_id,
    profileId: row.profile_id,
    sourceId: row.source_id,
    kind: row.kind,
    name: row.name,
    required: row.required,
    dueDate: row.due_date ? new Date(row.due_date).toISOString() : null,
    assignedBy: row.assigned_by,
    message: row.message,
    createdAt: new Date(row.created_at).toISOString(),
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null
  }));
}

export async function markLearningMembershipManaged(groupId: string, profileId: string, client: DbOrTxClient = db) {
  await client
    .update(schema.groupmember)
    .set({ learningAccessManaged: true })
    .where(and(eq(schema.groupmember.groupId, groupId), eq(schema.groupmember.profileId, profileId)));
}

export async function materializeCourseLearners(courseId: string, client: DbOrTxClient = db) {
  await client.execute(sql`insert into groupmember (group_id, profile_id, email, role_id, learning_access_managed)
    select distinct co.group_id, context.profile_id, pr.email, 3, true from course co
    join "group" cg on cg.id = co.group_id
    join (
      select pc.course_id, pm.profile_id, p.organization_id from program_course pc
      join program p on p.id = pc.program_id join program_member pm on pm.program_id = p.id
      where p.status = 'ACTIVE' and pm.role_id = 3
      union
      select cc.course_id, cm.profile_id, c.organization_id from cohort_course cc
      join cohort c on c.id = cc.cohort_id join cohort_member cm on cm.cohort_id = c.id
      where c.status = 'ACTIVE' and cm.role_id = 3
    ) context on context.course_id = co.id and context.organization_id = cg.organization_id
    join profile pr on pr.id = context.profile_id
    join organizationmember om on om.organization_id = cg.organization_id and om.profile_id = pr.id and om.status = 'ACTIVE'
    where co.id = ${courseId} and not exists (select 1 from employee e where e.member_id = om.id and e.status <> 'ACTIVE')
    on conflict do nothing`);
}

export function summarizeLearningContexts(contexts: Awaited<ReturnType<typeof getLearningContexts>>) {
  const active = contexts.filter((context) => !context.revokedAt);
  const required = active.filter((context) => context.required);
  const deadlines = required.flatMap((context) => (context.dueDate ? [context.dueDate] : []));
  deadlines.sort((left, right) => new Date(left).getTime() - new Date(right).getTime());
  return {
    learningSources: contexts,
    isAssigned: active.some((context) => ['DIRECT', 'PROGRAM', 'COHORT', 'COMPLIANCE'].includes(context.kind)),
    isSelfEnrolled: active.some((context) => context.kind === 'SELF'),
    isRequired: required.length > 0,
    learningDueDate: deadlines[0] ?? null
  };
}

export async function assignCourseGroups(
  groupIds: string[],
  profileIds: string[],
  actorId: string | null,
  client: DbOrTxClient = db
): Promise<void> {
  if (!groupIds.length || !profileIds.length) return;

  if (client === db)
    return db.transaction((transaction) => assignCourseGroups(groupIds, profileIds, actorId, transaction));

  const courses = await client
    .select({ id: schema.course.id })
    .from(schema.course)
    .where(inArray(schema.course.groupId, groupIds));
  for (const course of courses) {
    for (const profileId of profileIds) {
      const enrollment = await createEnrollmentSource(course.id, profileId, 'DIRECT', client);
      if (!enrollment.created) continue;

      await createTrainingAssignment(
        enrollment.source.id,
        { assignedBy: actorId, required: true, dueDate: null, message: '' },
        client
      );
    }
  }
}

export async function getEmployeeDirectTraining(employeeId: string, organizationId: string, client: DbOrTxClient = db) {
  return client
    .select({ courseId: schema.course.id, type: schema.course.type, sourceId: schema.courseEnrollmentSource.id })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.organizationmember.id, schema.employee.memberId))
    .innerJoin(
      schema.courseEnrollmentSource,
      eq(schema.courseEnrollmentSource.profileId, schema.organizationmember.profileId)
    )
    .innerJoin(schema.course, eq(schema.course.id, schema.courseEnrollmentSource.courseId))
    .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
    .where(
      and(
        eq(schema.employee.id, employeeId),
        eq(schema.employee.organizationId, organizationId),
        eq(schema.group.organizationId, organizationId),
        eq(schema.courseEnrollmentSource.kind, 'DIRECT'),
        isNull(schema.courseEnrollmentSource.revokedAt)
      )
    );
}

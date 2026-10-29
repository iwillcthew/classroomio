import {
  assignCourseGroups,
  revokeEnrollmentSource,
  getLearningContexts,
  learningMembershipSql,
  courseDeadlineSql
} from '../course/learning-access';
import { and, asc, count, eq, gt, ilike, inArray, isNull, or, sql } from 'drizzle-orm';
import { db, type DbOrTxClient } from '@db/drizzle';
import * as schema from '@db/schema';
import type { EmployeeListQuery } from '@cio/utils/validation/organization';
import { employeeLearningMemberIds } from './audience';

export async function findEmployee(orgId: string, employeeId: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select()
    .from(schema.employee)
    .where(and(eq(schema.employee.organizationId, orgId), eq(schema.employee.id, employeeId)))
    .limit(1);
  return row ?? null;
}

export async function employeeImportConflicts(
  orgId: string,
  codes: string[],
  emails: string[],
  client: DbOrTxClient = db
) {
  const employees = await client
    .select({ employeeCode: schema.employee.employeeCode, email: schema.employee.email })
    .from(schema.employee)
    .where(
      and(
        eq(schema.employee.organizationId, orgId),
        or(inArray(schema.employee.employeeCode, codes), inArray(schema.employee.email, emails))
      )
    );
  const members = await client
    .select({
      email: schema.organizationmember.email,
      roleId: schema.organizationmember.roleId,
      status: schema.organizationmember.status
    })
    .from(schema.organizationmember)
    .where(and(eq(schema.organizationmember.organizationId, orgId), inArray(schema.organizationmember.email, emails)));
  return { employees, members };
}

export async function getEmployeeByIdentity(identity: string, client: DbOrTxClient = db) {
  const rows = await client
    .select({ employee: schema.employee, member: schema.organizationmember })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.employee.memberId, schema.organizationmember.id))
    .where(
      or(
        eq(schema.employee.employeeCode, identity.trim().toUpperCase()),
        eq(schema.employee.email, identity.trim().toLowerCase())
      )
    )
    .limit(2);
  return rows.length === 1 ? rows[0] : null;
}

export async function canEmployeeSignIn(profileId: string, client: DbOrTxClient = db) {
  const rows = await client
    .select({ status: schema.employee.status, memberStatus: schema.organizationmember.status })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.employee.memberId, schema.organizationmember.id))
    .where(eq(schema.organizationmember.profileId, profileId));
  return rows.every((row) => row.status === 'ACTIVE' && row.memberStatus === 'ACTIVE');
}

export async function getEmployeeAccess(orgId: string, profileId: string, client: DbOrTxClient = db) {
  const [membership] = await client
    .select()
    .from(schema.organizationmember)
    .where(
      and(
        eq(schema.organizationmember.organizationId, orgId),
        eq(schema.organizationmember.profileId, profileId),
        eq(schema.organizationmember.status, 'ACTIVE')
      )
    )
    .limit(1);
  if (!membership) return null;

  const [staff] = await client
    .select()
    .from(schema.employee)
    .where(eq(schema.employee.memberId, membership.id))
    .limit(1);
  if (staff && staff.status !== 'ACTIVE') return null;

  const delegatedRole = staff && ['HR', 'MANAGER'].includes(staff.role) ? staff.role : 'EMPLOYEE';
  const role = membership.roleId === 1 ? 'ADMIN' : membership.roleId === 2 ? 'TUTOR' : delegatedRole;
  return { role, employeeId: staff?.id ?? null, canManage: role === 'ADMIN' || role === 'HR' };
}

export async function listEmployees(
  orgId: string,
  query: EmployeeListQuery,
  managerId?: string,
  client: DbOrTxClient = db
) {
  const filters = and(
    eq(schema.employee.organizationId, orgId),
    query.enrollment || query.completion || query.certificate
      ? inArray(schema.employee.memberId, employeeLearningMemberIds(orgId, query, client))
      : undefined,
    query.profileId
      ? sql`${schema.employee.memberId} in (select id from organizationmember where profile_id = ${query.profileId} and organization_id = ${orgId})`
      : undefined,
    managerId ? eq(schema.employee.managerId, managerId) : undefined,
    query.department ? ilike(schema.employee.department, `%${query.department}%`) : undefined,
    query.status ? eq(schema.employee.status, query.status) : undefined,
    query.search
      ? or(
          ilike(schema.employee.fullname, `%${query.search}%`),
          ilike(schema.employee.employeeCode, `%${query.search}%`),
          ilike(schema.employee.email, `%${query.search}%`)
        )
      : undefined
  );
  const rows = await client
    .select()
    .from(schema.employee)
    .where(filters)
    .orderBy(asc(schema.employee.employeeCode))
    .limit(query.limit)
    .offset((query.page - 1) * query.limit);
  const [total] = await client.select({ value: count() }).from(schema.employee).where(filters);
  return { rows, total: total?.value ?? 0, page: query.page, limit: query.limit };
}

export async function employeeOptions(orgId: string, client: DbOrTxClient = db) {
  const managers = await client
    .select({ id: schema.employee.id, fullname: schema.employee.fullname, employeeCode: schema.employee.employeeCode })
    .from(schema.employee)
    .where(
      and(
        eq(schema.employee.organizationId, orgId),
        eq(schema.employee.status, 'ACTIVE'),
        inArray(schema.employee.role, ['MANAGER', 'HR', 'ADMIN'])
      )
    );
  const courses = await client
    .select({ id: schema.course.id, title: schema.course.title, isPublished: schema.course.isPublished })
    .from(schema.course)
    .innerJoin(schema.group, eq(schema.course.groupId, schema.group.id))
    .where(eq(schema.group.organizationId, orgId));
  const cohorts = await client
    .select({ id: schema.cohort.id, name: schema.cohort.name })
    .from(schema.cohort)
    .where(and(eq(schema.cohort.organizationId, orgId), eq(schema.cohort.status, 'ACTIVE')));
  return { managers, courses, cohorts };
}

export async function findEmployeeAccount(email: string, orgId: string, client: DbOrTxClient = db) {
  const [account] = await client.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  const [member] = await client
    .select()
    .from(schema.organizationmember)
    .where(and(eq(schema.organizationmember.organizationId, orgId), eq(schema.organizationmember.email, email)))
    .limit(1);
  return { account: account ?? null, member: member ?? null };
}

export async function insertEmployee(values: typeof schema.employee.$inferInsert, client: DbOrTxClient = db) {
  const [row] = await client.insert(schema.employee).values(values).returning();
  return row;
}

export async function insertEmployeeMember(
  values: typeof schema.organizationmember.$inferInsert,
  client: DbOrTxClient = db
) {
  const [row] = await client.insert(schema.organizationmember).values(values).returning();
  return row;
}

export async function updateEmployee(
  employeeId: string,
  values: Partial<typeof schema.employee.$inferInsert>,
  client: DbOrTxClient = db
) {
  const [row] = await client.update(schema.employee).set(values).where(eq(schema.employee.id, employeeId)).returning();
  return row;
}

export async function updateEmployeeMember(
  memberId: number,
  values: Partial<typeof schema.organizationmember.$inferInsert>,
  client: DbOrTxClient = db
) {
  const [row] = await client
    .update(schema.organizationmember)
    .set(values)
    .where(eq(schema.organizationmember.id, memberId))
    .returning();
  return row;
}

export async function updateEmployeeProfile(profileId: string, fullname: string, client: DbOrTxClient = db) {
  await client.update(schema.profile).set({ fullname }).where(eq(schema.profile.id, profileId));
  await client.update(schema.user).set({ name: fullname }).where(eq(schema.user.id, profileId));
}

export async function addEmployeeAudit(
  employeeId: string,
  actorId: string | null,
  action: string,
  reason = '',
  client: DbOrTxClient = db
) {
  await client.insert(schema.employeeAudit).values({ employeeId, actorId, action, reason });
}

export async function getEmployeeAudit(employeeId: string, client: DbOrTxClient = db) {
  return client
    .select({
      id: schema.employeeAudit.id,
      actorId: schema.employeeAudit.actorId,
      actorName: schema.profile.fullname,
      action: schema.employeeAudit.action,
      reason: schema.employeeAudit.reason,
      createdAt: schema.employeeAudit.createdAt
    })
    .from(schema.employeeAudit)
    .leftJoin(schema.profile, eq(schema.employeeAudit.actorId, schema.profile.id))
    .where(eq(schema.employeeAudit.employeeId, employeeId))
    .orderBy(sql`${schema.employeeAudit.createdAt} desc`)
    .limit(100);
}

export async function getEmployeeAssignments(employeeId: string, client: DbOrTxClient = db, provisioning = false) {
  const courses = await client
    .select()
    .from(schema.employeeCourse)
    .where(eq(schema.employeeCourse.employeeId, employeeId));
  const cohorts = await client
    .select()
    .from(schema.employeeCohort)
    .where(eq(schema.employeeCohort.employeeId, employeeId));
  let courseIds = courses.map((row) => row.courseId);
  const [identity] = await client
    .select({
      activatedAt: schema.employee.activatedAt,
      profileId: schema.organizationmember.profileId,
      organizationId: schema.employee.organizationId
    })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.organizationmember.id, schema.employee.memberId))
    .where(eq(schema.employee.id, employeeId));
  if (!provisioning && identity?.activatedAt && identity.profileId) {
    const direct = await client
      .select({ courseId: schema.courseEnrollmentSource.courseId })
      .from(schema.courseEnrollmentSource)
      .where(
        and(
          eq(schema.courseEnrollmentSource.profileId, identity.profileId),
          eq(schema.courseEnrollmentSource.kind, 'DIRECT'),
          isNull(schema.courseEnrollmentSource.revokedAt)
        )
      );
    const scoped = await client
      .select({ id: schema.course.id })
      .from(schema.course)
      .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
      .where(eq(schema.group.organizationId, identity.organizationId));
    const allowed = new Set(scoped.map((course) => course.id));
    courseIds = direct.flatMap((source) => (allowed.has(source.courseId) ? [source.courseId] : []));
  }
  const cohortIds = cohorts.map((row) => row.cohortId);
  return { courseIds, cohortIds };
}

export async function saveEmployeeAssignments(
  employeeId: string,
  courseIds: string[],
  cohortIds: string[],
  client: DbOrTxClient = db,
  actorId: string | null = null
) {
  await client.delete(schema.employeeCourse).where(eq(schema.employeeCourse.employeeId, employeeId));
  await client.delete(schema.employeeCohort).where(eq(schema.employeeCohort.employeeId, employeeId));
  if (courseIds.length)
    await client
      .insert(schema.employeeCourse)
      .values([...new Set(courseIds)].map((courseId) => ({ employeeId, courseId })));
  if (cohortIds.length)
    await client
      .insert(schema.employeeCohort)
      .values([...new Set(cohortIds)].map((cohortId) => ({ employeeId, cohortId })));
  const [identity] = await client
    .select({
      profileId: schema.organizationmember.profileId,
      activatedAt: schema.employee.activatedAt,
      organizationId: schema.employee.organizationId
    })
    .from(schema.employee)
    .innerJoin(schema.organizationmember, eq(schema.organizationmember.id, schema.employee.memberId))
    .where(eq(schema.employee.id, employeeId));
  if (identity?.activatedAt && identity.profileId) {
    const assignedGroups = await client
      .select({ groupId: schema.course.groupId })
      .from(schema.course)
      .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
      .where(and(inArray(schema.course.id, courseIds), eq(schema.group.organizationId, identity.organizationId)));
    const groupIds = assignedGroups.flatMap((course) => (course.groupId ? [course.groupId] : []));
    await assignCourseGroups(groupIds, [identity.profileId], actorId, client);
    const sources = await client
      .select()
      .from(schema.courseEnrollmentSource)
      .where(
        and(
          eq(schema.courseEnrollmentSource.profileId, identity.profileId),
          eq(schema.courseEnrollmentSource.kind, 'DIRECT'),
          isNull(schema.courseEnrollmentSource.revokedAt)
        )
      );
    for (const source of sources) {
      const context = await client
        .select({ orgId: schema.group.organizationId })
        .from(schema.course)
        .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
        .where(eq(schema.course.id, source.courseId));
      if (context[0]?.orgId !== identity.organizationId || courseIds.includes(source.courseId)) continue;

      await revokeEnrollmentSource(source.courseId, source.id, actorId ?? identity.profileId, client);
    }
  }
}

export async function enrollEmployee(employeeId: string, profileId: string, email: string, client: DbOrTxClient = db) {
  const assignments = await getEmployeeAssignments(employeeId, client, true);
  if (assignments.cohortIds.length) {
    await client
      .update(schema.cohortMember)
      .set({ profileId })
      .where(
        and(
          inArray(schema.cohortMember.cohortId, assignments.cohortIds),
          eq(schema.cohortMember.email, email),
          isNull(schema.cohortMember.profileId)
        )
      );
    await client
      .insert(schema.cohortMember)
      .values(assignments.cohortIds.map((cohortId) => ({ cohortId, profileId, email, roleId: 3 })))
      .onConflictDoNothing();
  }
  const cohortCourses = assignments.cohortIds.length
    ? await client
        .select()
        .from(schema.cohortCourse)
        .where(inArray(schema.cohortCourse.cohortId, assignments.cohortIds))
    : [];
  const courseIds = [...new Set([...assignments.courseIds, ...cohortCourses.map((row) => row.courseId)])];
  if (!courseIds.length) return;

  const courses = await client
    .select({ groupId: schema.course.groupId })
    .from(schema.course)
    .where(inArray(schema.course.id, courseIds));
  const groups = courses.flatMap((row) => (row.groupId ? [row.groupId] : []));
  if (groups.length) {
    await client
      .update(schema.groupmember)
      .set({ profileId })
      .where(
        and(
          inArray(schema.groupmember.groupId, groups),
          eq(schema.groupmember.email, email),
          isNull(schema.groupmember.profileId)
        )
      );
    await client
      .insert(schema.groupmember)
      .values(groups.map((groupId) => ({ groupId, profileId, email, roleId: 3, learningAccessManaged: true })))
      .onConflictDoNothing();
  }
  const directGroups = await client
    .select({ groupId: schema.course.groupId })
    .from(schema.course)
    .where(inArray(schema.course.id, assignments.courseIds));
  const groupIds = directGroups.flatMap((course) => (course.groupId ? [course.groupId] : []));
  await assignCourseGroups(groupIds, [profileId], null, client);
}

export async function issueEmployeeActivation(
  employeeId: string,
  tokenHash: string,
  expiresAt: string,
  client: DbOrTxClient = db
) {
  await revokeEmployeeActivations(employeeId, client);
  await client.insert(schema.employeeActivation).values({ employeeId, tokenHash, expiresAt });
}

export async function revokeEmployeeActivations(employeeId: string, client: DbOrTxClient = db) {
  const usedAt = new Date().toISOString();
  await client
    .update(schema.employeeActivation)
    .set({ usedAt })
    .where(and(eq(schema.employeeActivation.employeeId, employeeId), isNull(schema.employeeActivation.usedAt)));
}

export async function findEmployeeActivation(tokenHash: string, client: DbOrTxClient = db) {
  const [row] = await client
    .select({ employee: schema.employee })
    .from(schema.employeeActivation)
    .innerJoin(schema.employee, eq(schema.employeeActivation.employeeId, schema.employee.id))
    .where(
      and(
        eq(schema.employeeActivation.tokenHash, tokenHash),
        isNull(schema.employeeActivation.usedAt),
        gt(schema.employeeActivation.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);
  return row?.employee ?? null;
}

export async function consumeEmployeeActivation(tokenHash: string, client: DbOrTxClient = db) {
  const now = new Date().toISOString();
  const [row] = await client
    .update(schema.employeeActivation)
    .set({ usedAt: now })
    .where(
      and(
        eq(schema.employeeActivation.tokenHash, tokenHash),
        isNull(schema.employeeActivation.usedAt),
        gt(schema.employeeActivation.expiresAt, now)
      )
    )
    .returning();
  return row ?? null;
}

export async function getEmployeeOrganizationLocale(orgId: string, client: DbOrTxClient = db) {
  const [organization] = await client
    .select({ settings: schema.organization.settings })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);
  return organization?.settings?.language?.locale ?? 'vi';
}

export async function createEmployeeCredentials(
  email: string,
  fullname: string,
  passwordHash: string,
  client: DbOrTxClient = db,
  language: (typeof schema.profile.$inferInsert)['locale'] = 'vi'
) {
  const [newUser] = await client.insert(schema.user).values({ email, name: fullname, emailVerified: true }).returning();
  await client
    .insert(schema.account)
    .values({ userId: newUser.id, accountId: newUser.id, providerId: 'credential', password: passwordHash });
  const verifiedAt = new Date().toISOString();
  await client.insert(schema.profile).values({
    id: newUser.id,
    email,
    fullname,
    username: newUser.id,
    isEmailVerified: true,
    verifiedAt,
    locale: language
  });
  return newUser.id;
}

export async function revokeEmployeeSessions(profileId: string, client: DbOrTxClient = db) {
  await client.delete(schema.session).where(eq(schema.session.userId, profileId));
}

export async function lockEmployeeOrganization(orgId: string, client: DbOrTxClient = db) {
  await client
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .for('update');
}

export async function countEmployeeAdmins(orgId: string, client: DbOrTxClient = db) {
  const [result] = await client
    .select({ value: count() })
    .from(schema.organizationmember)
    .where(
      and(
        eq(schema.organizationmember.organizationId, orgId),
        eq(schema.organizationmember.roleId, 1),
        eq(schema.organizationmember.status, 'ACTIVE')
      )
    );
  return result?.value ?? 0;
}

export async function employeeLearningReport(orgId: string, employeeId: string, client: DbOrTxClient = db) {
  const employeeRow = await findEmployee(orgId, employeeId, client);
  if (!employeeRow) return [];

  const [member] = await client
    .select()
    .from(schema.organizationmember)
    .where(eq(schema.organizationmember.id, employeeRow.memberId));
  if (!member?.profileId) return [];

  const totalItems = sql<number>`((select count(*) from lesson where course_id = ${schema.course.id}) + (select count(*) from exercise e left join lesson l on e.lesson_id = l.id where e.course_id = ${schema.course.id} or l.course_id = ${schema.course.id}))`;
  const completedItems = sql<number>`((select count(*) from lesson_completion lc join lesson l on l.id = lc.lesson_id where l.course_id = ${schema.course.id} and lc.profile_id = ${member.profileId} and lc.is_complete = true) + (select count(distinct s.exercise_id) from submission s join exercise e on e.id = s.exercise_id left join lesson l on l.id = e.lesson_id where (e.course_id = ${schema.course.id} or l.course_id = ${schema.course.id}) and s.submitted_by = ${schema.groupmember.id}))`;
  const latestStatus = sql<string>`(select status from course_completion_record where course_id = ${schema.course.id} and profile_id = ${member.profileId} order by cycle_number desc limit 1)`;
  const status = sql<string>`coalesce(${latestStatus}, case when ${schema.groupmember.completedAt} is not null or (${totalItems} > 0 and ${completedItems} >= ${totalItems}) then 'completed' when ${completedItems} > 0 then 'in_progress' else 'not_started' end)`;
  const completedAt = sql<
    string | null
  >`coalesce(${schema.groupmember.completedAt}, (select completed_at from course_completion_record where course_id = ${schema.course.id} and profile_id = ${member.profileId} order by cycle_number desc limit 1))`;
  const dueDate = sql<
    string | null
  >`(select due_date from course_completion_record where course_id = ${schema.course.id} and profile_id = ${member.profileId} order by cycle_number desc limit 1)`;
  const score = sql<
    number | null
  >`(select score from course_completion_record where course_id = ${schema.course.id} and profile_id = ${member.profileId} order by cycle_number desc limit 1)`;
  const deadline = courseDeadlineSql(sql`${schema.course.id}`, member.profileId);
  const rows = await client
    .select({ courseId: schema.course.id, title: schema.course.title, status, completedAt, dueDate: deadline, score })
    .from(schema.course)
    .innerJoin(schema.group, eq(schema.course.groupId, schema.group.id))
    .innerJoin(
      schema.groupmember,
      and(eq(schema.groupmember.groupId, schema.group.id), eq(schema.groupmember.profileId, member.profileId))
    )
    .where(
      and(
        eq(schema.group.organizationId, orgId),
        learningMembershipSql(sql`${schema.course.id}`, sql`${schema.course.groupId}`, member.profileId)
      )
    );
  const contexts = await getLearningContexts(
    orgId,
    { profileIds: [member.profileId], courseIds: rows.map((row) => row.courseId) },
    client
  );
  return rows.map((row) => ({
    ...row,
    learningSources: contexts.filter((context) => context.courseId === row.courseId)
  }));
}

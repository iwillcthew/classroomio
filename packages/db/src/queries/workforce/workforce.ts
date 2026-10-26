import { and, count, desc, eq, getTableColumns, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { db, type DbOrTxClient, type TxClient } from '@db/drizzle';
import * as schema from '@db/schema';
import type { TWorkforceFilters, TWorkforceProfileQuery } from '@cio/utils/validation/organization';
import { workforceMemberFilter, workforceMemberSearch } from './filters';

export async function workforceTransaction<T>(
  organizationId: string,
  operation: (transaction: TxClient) => Promise<T>
) {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select pg_advisory_xact_lock(hashtextextended(${organizationId}, 0))`);
    return operation(transaction);
  });
}

export async function workforceSavepoint<T>(transaction: TxClient, operation: (savepoint: TxClient) => Promise<T>) {
  return transaction.transaction(operation);
}

export async function getWorkforceEmployeeIdentity(
  organizationId: string,
  employeeId: string,
  client: DbOrTxClient = db
) {
  const columns = getTableColumns(schema.workforceEmployee);
  const [employee] = await client
    .select({ ...columns, fullname: schema.profile.fullname, email: schema.profile.email })
    .from(schema.workforceEmployee)
    .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceEmployee.profileId))
    .where(
      and(eq(schema.workforceEmployee.organizationId, organizationId), eq(schema.workforceEmployee.id, employeeId))
    );
  return employee ?? null;
}

export async function getWorkforceActor(organizationId: string, profileId: string, client: DbOrTxClient = db) {
  const [membership] = await client
    .select()
    .from(schema.organizationmember)
    .where(
      and(
        eq(schema.organizationmember.organizationId, organizationId),
        eq(schema.organizationmember.profileId, profileId),
        eq(schema.organizationmember.status, 'ACTIVE')
      )
    );
  const [employee] = await client
    .select()
    .from(schema.workforceEmployee)
    .where(
      and(
        eq(schema.workforceEmployee.organizationId, organizationId),
        eq(schema.workforceEmployee.profileId, profileId)
      )
    );
  const units = employee
    ? await client
        .select({ id: schema.workforceUnit.id })
        .from(schema.workforceUnit)
        .where(
          and(eq(schema.workforceUnit.organizationId, organizationId), eq(schema.workforceUnit.leaderId, employee.id))
        )
    : [];
  const active = !employee || employee.status === 'ACTIVE';
  const canManage = !!membership && active && (membership.roleId === 1 || employee?.accessRole === 'HR');
  const unitIds = units.map((unit) => unit.id);
  const reports = employee
    ? await client
        .select({ id: schema.workforceEmployee.id })
        .from(schema.workforceEmployee)
        .where(
          and(
            eq(schema.workforceEmployee.organizationId, organizationId),
            eq(schema.workforceEmployee.managerId, employee.id)
          )
        )
    : [];
  const reportIds = reports.map((report) => report.id);
  const isSystemAdmin = membership?.roleId === 1;
  return {
    profileId,
    employeeId: employee?.id ?? null,
    canManage,
    isSystemAdmin,
    unitIds,
    reportIds,
    active: !!membership && active
  };
}

export async function findEmployeeByCode(employeeCode: string, client: DbOrTxClient = db) {
  const [employee] = await client
    .select({ employee: schema.workforceEmployee, email: schema.user.email })
    .from(schema.workforceEmployee)
    .innerJoin(schema.user, eq(schema.user.id, schema.workforceEmployee.profileId))
    .where(eq(schema.workforceEmployee.employeeCode, employeeCode));
  return employee ?? null;
}

export async function findEmployeeByEmail(email: string, client: DbOrTxClient = db) {
  const [result] = await client
    .select({ employee: schema.workforceEmployee, email: schema.user.email })
    .from(schema.workforceEmployee)
    .innerJoin(schema.user, eq(schema.user.id, schema.workforceEmployee.profileId))
    .where(eq(schema.user.email, email));
  return result ?? null;
}

export async function getLegacyEmailLoginContext(email: string, client: DbOrTxClient = db) {
  const [identity] = await client
    .select({
      hasAdminMembership: sql<boolean>`exists (select 1 from ${schema.organizationmember} membership
      where membership.profile_id = "user"."id"::uuid and membership.role_id = 1 and membership.status = 'ACTIVE')`,
      organizationExists: sql<boolean>`exists (select 1 from ${schema.organization})`
    })
    .from(schema.user)
    .where(eq(schema.user.email, email));
  return identity ?? null;
}

export async function getWorkforceEmployee(organizationId: string, employeeId: string, client: DbOrTxClient = db) {
  const [employee] = await client
    .select()
    .from(schema.workforceEmployee)
    .where(
      and(eq(schema.workforceEmployee.organizationId, organizationId), eq(schema.workforceEmployee.id, employeeId))
    );
  return employee ?? null;
}

export async function getWorkforceDirectory(organizationId: string, client: DbOrTxClient = db) {
  const columns = getTableColumns(schema.workforceEmployee);
  const employees = await client
    .select({ ...columns, fullname: schema.profile.fullname, email: schema.profile.email })
    .from(schema.workforceEmployee)
    .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceEmployee.profileId))
    .where(eq(schema.workforceEmployee.organizationId, organizationId));
  const units = await client
    .select()
    .from(schema.workforceUnit)
    .where(eq(schema.workforceUnit.organizationId, organizationId));
  const jobTitles = await client
    .select()
    .from(schema.workforceJobTitle)
    .where(eq(schema.workforceJobTitle.organizationId, organizationId));
  return { employees, units, jobTitles };
}

export async function listWorkforceEmployees(
  organizationId: string,
  filters: TWorkforceFilters,
  scope: SQL | undefined
) {
  const conditions = [eq(schema.workforceEmployee.organizationId, organizationId), scope];
  if (filters.unitId) conditions.push(eq(schema.workforceEmployee.unitId, filters.unitId));
  if (filters.jobTitleId) conditions.push(eq(schema.workforceEmployee.jobTitleId, filters.jobTitleId));
  if (filters.status) conditions.push(eq(schema.workforceEmployee.status, filters.status));
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(
      or(
        ilike(schema.workforceEmployee.employeeCode, pattern),
        ilike(schema.profile.fullname, pattern),
        ilike(schema.profile.email, pattern),
        ilike(schema.workforceUnit.name, pattern),
        ilike(schema.workforceJobTitle.name, pattern)
      )
    );
  }
  const predicate = and(...conditions);
  const effectiveManagerId = sql<
    string | null
  >`coalesce(${schema.workforceEmployee.managerId}, nullif(${schema.workforceUnit.leaderId}, ${schema.workforceEmployee.id}))`;
  const effectiveManagerName = sql<string | null>`(select manager_profile.fullname from workforce_employee manager
    join profile manager_profile on manager_profile.id = manager.profile_id where manager.id = ${effectiveManagerId})`;
  const joined = () =>
    db
      .select({
        employee: schema.workforceEmployee,
        fullname: schema.profile.fullname,
        email: schema.profile.email,
        unit: schema.workforceUnit.name,
        jobTitle: schema.workforceJobTitle.name,
        effectiveManagerId,
        effectiveManagerName
      })
      .from(schema.workforceEmployee)
      .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceEmployee.profileId))
      .leftJoin(schema.workforceUnit, eq(schema.workforceUnit.id, schema.workforceEmployee.unitId))
      .leftJoin(schema.workforceJobTitle, eq(schema.workforceJobTitle.id, schema.workforceEmployee.jobTitleId));
  const rows = await joined()
    .where(predicate)
    .orderBy(schema.workforceEmployee.employeeCode)
    .limit(filters.limit)
    .offset((filters.page - 1) * filters.limit);
  const totals = await db
    .select({ total: count() })
    .from(schema.workforceEmployee)
    .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceEmployee.profileId))
    .leftJoin(schema.workforceUnit, eq(schema.workforceUnit.id, schema.workforceEmployee.unitId))
    .leftJoin(schema.workforceJobTitle, eq(schema.workforceJobTitle.id, schema.workforceEmployee.jobTitleId))
    .where(predicate);
  return { rows, total: totals[0].total, page: filters.page, limit: filters.limit };
}

export function workforceActorScope(actor: Awaited<ReturnType<typeof getWorkforceActor>>) {
  if (actor.canManage) return undefined;

  const own = actor.employeeId ? eq(schema.workforceEmployee.id, actor.employeeId) : sql`false`;
  const units = actor.unitIds.length ? inArray(schema.workforceEmployee.unitId, actor.unitIds) : sql`false`;
  const reports = actor.reportIds.length ? inArray(schema.workforceEmployee.id, actor.reportIds) : sql`false`;
  return or(own, units, reports);
}

export function workforceProfileScope(profileId: string) {
  return eq(schema.workforceEmployee.profileId, profileId);
}

export async function listWorkforceScopedProfiles(
  organizationId: string,
  filters: TWorkforceProfileQuery,
  scope: SQL | undefined
) {
  const conditions = [
    eq(schema.organizationmember.organizationId, organizationId),
    scope,
    workforceMemberFilter(schema.profile.id, filters)
  ];
  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(
      or(
        ilike(schema.profile.fullname, pattern),
        ilike(schema.profile.email, pattern),
        workforceMemberSearch(schema.profile.id, filters.search)
      )
    );
  }
  if (filters.courseId) {
    conditions.push(
      sql`exists (select 1 from groupmember member join course assigned_course on assigned_course.group_id = member.group_id where member.profile_id = "profile"."id" and assigned_course.id = ${filters.courseId}::uuid)`
    );
  }
  const rows = await db
    .selectDistinct({ profileId: schema.profile.id })
    .from(schema.organizationmember)
    .innerJoin(schema.profile, eq(schema.profile.id, schema.organizationmember.profileId))
    .leftJoin(
      schema.workforceEmployee,
      and(
        eq(schema.workforceEmployee.profileId, schema.profile.id),
        eq(schema.workforceEmployee.organizationId, organizationId)
      )
    )
    .where(and(...conditions));
  return rows.map((row) => row.profileId);
}

export async function createWorkforceIdentity(
  organizationId: string,
  fields: { email: string; fullname: string; profileId: string; passwordHash: string },
  client: DbOrTxClient
) {
  const [existing] = await client.select().from(schema.user).where(eq(schema.user.email, fields.email));
  if (existing) return existing;

  const [created] = await client
    .insert(schema.user)
    .values({ id: fields.profileId, name: fields.fullname, email: fields.email })
    .returning();
  await client.insert(schema.profile).values({
    id: created.id,
    fullname: fields.fullname,
    username: `employee-${created.id}`,
    email: fields.email,
    locale: 'vi'
  });
  await client
    .insert(schema.account)
    .values({ accountId: created.id, userId: created.id, providerId: 'credential', password: fields.passwordHash });
  return created;
}

export async function listWorkforceIdentityOrganizations(profileId: string, client: DbOrTxClient = db) {
  return client
    .select({ organizationId: schema.organizationmember.organizationId, roleId: schema.organizationmember.roleId })
    .from(schema.organizationmember)
    .where(eq(schema.organizationmember.profileId, profileId));
}

export async function insertWorkforceEmployee(
  values: typeof schema.workforceEmployee.$inferInsert,
  email: string,
  client: DbOrTxClient
) {
  const [employee] = await client.insert(schema.workforceEmployee).values(values).returning();
  const [existing] = await client
    .select()
    .from(schema.organizationmember)
    .where(
      and(
        eq(schema.organizationmember.organizationId, employee.organizationId),
        or(
          eq(schema.organizationmember.profileId, employee.profileId),
          sql`lower(${schema.organizationmember.email}) = ${email}`
        )
      )
    );
  if (existing?.profileId && existing.profileId !== employee.profileId)
    throw new Error('Membership is linked to another identity');

  if (existing) {
    await client
      .update(schema.organizationmember)
      .set({ profileId: employee.profileId, email })
      .where(eq(schema.organizationmember.id, existing.id));
  } else {
    await client.insert(schema.organizationmember).values({
      organizationId: employee.organizationId,
      profileId: employee.profileId,
      email,
      roleId: 3,
      status: 'ACTIVE'
    });
  }
  return employee;
}

export async function updateWorkforceEmployeeRow(
  organizationId: string,
  employeeId: string,
  values: Partial<typeof schema.workforceEmployee.$inferInsert>,
  client: DbOrTxClient
) {
  const [employee] = await client
    .update(schema.workforceEmployee)
    .set(values)
    .where(
      and(eq(schema.workforceEmployee.id, employeeId), eq(schema.workforceEmployee.organizationId, organizationId))
    )
    .returning();
  return employee;
}

export async function updateWorkforceProfile(profileId: string, fullname: string | undefined, client: DbOrTxClient) {
  if (!fullname) return;

  await client.update(schema.profile).set({ fullname }).where(eq(schema.profile.id, profileId));
  await client.update(schema.user).set({ name: fullname }).where(eq(schema.user.id, profileId));
}

export async function setWorkforceAccess(employee: typeof schema.workforceEmployee.$inferSelect, client: DbOrTxClient) {
  const status = employee.status === 'ACTIVE' ? 'ACTIVE' : 'DEACTIVATED';
  const roleId = employee.accessRole === 'INSTRUCTOR' ? 2 : 3;
  const effectiveRole = sql<number>`case when ${schema.organizationmember.roleId} = 1 then 1 else ${roleId} end`;
  const verified = employee.status === 'ACTIVE';
  await client
    .update(schema.organizationmember)
    .set({ status, roleId: effectiveRole, verified })
    .where(
      and(
        eq(schema.organizationmember.organizationId, employee.organizationId),
        eq(schema.organizationmember.profileId, employee.profileId)
      )
    );
  const courseRole = sql<number>`case when exists (select 1 from ${schema.organizationmember} membership
    where membership.organization_id = ${employee.organizationId} and membership.profile_id = ${employee.profileId} and membership.role_id = 1) then 1 else ${roleId} end`;
  await client
    .update(schema.groupmember)
    .set({ roleId: courseRole })
    .where(
      and(
        eq(schema.groupmember.profileId, employee.profileId),
        sql`${schema.groupmember.groupId} in (select id from ${schema.group} where organization_id = ${employee.organizationId})`
      )
    );
  await client.delete(schema.session).where(eq(schema.session.userId, employee.profileId));
}

export async function insertWorkforceHistory(
  values: typeof schema.workforceHistory.$inferInsert,
  client: DbOrTxClient
) {
  await client.insert(schema.workforceHistory).values(values);
}

export async function listWorkforceHistory(organizationId: string, employeeId: string) {
  const columns = getTableColumns(schema.workforceHistory);
  return db
    .select({ ...columns, actorName: schema.profile.fullname })
    .from(schema.workforceHistory)
    .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceHistory.actorId))
    .where(
      and(
        eq(schema.workforceHistory.organizationId, organizationId),
        eq(schema.workforceHistory.employeeId, employeeId)
      )
    )
    .orderBy(desc(schema.workforceHistory.createdAt))
    .limit(200);
}

export async function saveWorkforceUnit(
  values: typeof schema.workforceUnit.$inferInsert,
  resourceId: string | undefined,
  client: DbOrTxClient
) {
  const rows = resourceId
    ? await client
        .update(schema.workforceUnit)
        .set(values)
        .where(
          and(eq(schema.workforceUnit.id, resourceId), eq(schema.workforceUnit.organizationId, values.organizationId))
        )
        .returning()
    : await client.insert(schema.workforceUnit).values(values).returning();
  return rows[0];
}

export async function saveWorkforceJobTitle(
  values: typeof schema.workforceJobTitle.$inferInsert,
  resourceId: string | undefined,
  client: DbOrTxClient
) {
  const rows = resourceId
    ? await client
        .update(schema.workforceJobTitle)
        .set(values)
        .where(
          and(
            eq(schema.workforceJobTitle.id, resourceId),
            eq(schema.workforceJobTitle.organizationId, values.organizationId)
          )
        )
        .returning()
    : await client.insert(schema.workforceJobTitle).values(values).returning();
  return rows[0];
}

export async function issueWorkforceActivation(
  employeeId: string,
  tokenHash: string,
  expiresAt: string,
  client: DbOrTxClient
) {
  await client.delete(schema.workforceActivation).where(eq(schema.workforceActivation.employeeId, employeeId));
  const [activation] = await client
    .insert(schema.workforceActivation)
    .values({ employeeId, tokenHash, expiresAt })
    .returning();
  return activation;
}

export async function findWorkforceActivation(tokenHash: string, client: DbOrTxClient = db) {
  const [result] = await client
    .select({
      activation: schema.workforceActivation,
      employee: schema.workforceEmployee,
      fullname: schema.profile.fullname
    })
    .from(schema.workforceActivation)
    .innerJoin(schema.workforceEmployee, eq(schema.workforceEmployee.id, schema.workforceActivation.employeeId))
    .innerJoin(schema.profile, eq(schema.profile.id, schema.workforceEmployee.profileId))
    .where(and(eq(schema.workforceActivation.tokenHash, tokenHash), isNull(schema.workforceActivation.usedAt)));
  return result ?? null;
}

export async function consumeWorkforceActivation(
  activationId: string,
  employee: typeof schema.workforceEmployee.$inferSelect,
  passwordHash: string,
  client: DbOrTxClient
) {
  const now = new Date().toISOString();
  const [consumed] = await client
    .update(schema.workforceActivation)
    .set({ usedAt: now })
    .where(
      and(
        eq(schema.workforceActivation.id, activationId),
        isNull(schema.workforceActivation.usedAt),
        sql`${schema.workforceActivation.expiresAt} > now()`
      )
    )
    .returning();
  if (!consumed) return null;

  const existing = await client
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, employee.profileId), eq(schema.account.providerId, 'credential')));
  if (existing.length) {
    await client.update(schema.account).set({ password: passwordHash }).where(eq(schema.account.id, existing[0].id));
  } else {
    await client.insert(schema.account).values({
      userId: employee.profileId,
      accountId: employee.profileId,
      providerId: 'credential',
      password: passwordHash
    });
  }
  await client.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, employee.profileId));
  await client
    .update(schema.profile)
    .set({ isEmailVerified: true, verifiedAt: now })
    .where(eq(schema.profile.id, employee.profileId));
  const activated = await updateWorkforceEmployeeRow(
    employee.organizationId,
    employee.id,
    { status: 'ACTIVE', activatedAt: now },
    client
  );
  await setWorkforceAccess(activated, client);
  return activated;
}

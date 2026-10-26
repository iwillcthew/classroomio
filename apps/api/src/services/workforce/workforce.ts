import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hashAuthPassword } from '@cio/db/auth';
import {
  consumeWorkforceActivation,
  createWorkforceIdentity,
  enrollWorkforceCourse,
  findWorkforceActivation,
  getWorkforceActor,
  getWorkforceAssignedPaths,
  getWorkforceAssignments,
  getWorkforceDirectory,
  getWorkforceEmployee,
  getWorkforceEmployeeIdentity,
  getWorkforceTrainingCatalog,
  insertWorkforceAssignment,
  insertWorkforceEmployee,
  insertWorkforceHistory,
  issueWorkforceActivation,
  listWorkforceEmployees,
  listWorkforceHistory,
  listWorkforceScopedProfiles,
  listWorkforceIdentityOrganizations,
  saveWorkforceJobTitle,
  saveWorkforceLearningPath,
  saveWorkforceTrainingRule,
  saveWorkforceUnit,
  setWorkforceAccess,
  updateWorkforceEmployeeRow,
  updateWorkforceProfile,
  workforceActorScope,
  workforceProfileScope,
  workforceSavepoint,
  workforceTransaction
} from '@cio/db/queries/workforce';
import type { DbOrTxClient } from '@cio/db/drizzle';
import type {
  TCreateEmployee,
  TJobTitle,
  TLearningPath,
  TTrainingRule,
  TUpdateEmployee,
  TWorkforceFilters,
  TWorkforceProfileQuery,
  TWorkforceUnit
} from '@cio/utils/validation/organization';
import { AppError } from '@api/utils/errors';
import { enqueueTransactionalEmail } from '@api/services/jobs';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { getOrganizationById } from '@cio/db/queries/organization';
import { getOrgIdByCourseId } from '@cio/db/queries/course';
import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';

function fail(message: string, statusCode = 400): never {
  throw new AppError(message, 'WORKFORCE_ERROR', statusCode);
}

export async function requireWorkforceActor(
  organizationId: string,
  profileId: string,
  manage = false,
  client?: DbOrTxClient
) {
  const actor = await getWorkforceActor(organizationId, profileId, client);
  if (!actor.active || (manage && !actor.canManage)) fail('workforce.errors.forbidden', 403);

  return actor;
}

export async function getWorkforceOverview(organizationId: string, profileId: string, filters: TWorkforceFilters) {
  const actor = await requireWorkforceActor(organizationId, profileId);
  const scope = workforceActorScope(actor);
  const employees = await listWorkforceEmployees(organizationId, filters, scope);
  const directory = await getWorkforceDirectory(organizationId);
  const catalog = await getWorkforceTrainingCatalog(organizationId);
  const people = actor.canManage
    ? directory.employees
    : directory.employees.filter(
        (employee) =>
          employee.id === actor.employeeId ||
          actor.unitIds.includes(employee.unitId ?? '') ||
          actor.reportIds.includes(employee.id)
      );
  const units = actor.canManage
    ? directory.units
    : directory.units.filter(
        (unit) => actor.unitIds.includes(unit.id) || people.some((employee) => employee.unitId === unit.id)
      );
  const rules = actor.canManage ? catalog.rules : [];
  const targets = actor.canManage ? catalog.targets : [];
  const courses = actor.canManage ? catalog.courses : [];
  const exams = actor.canManage ? catalog.exams : [];
  const paths = actor.canManage
    ? catalog.paths
    : catalog.paths.filter((path) => people.some((employee) => employee.jobTitleId === path.jobTitleId));
  const pathIds = paths.map((path) => path.id);
  const pathCourses = catalog.pathCourses.filter((entry) => pathIds.includes(entry.pathId));
  return {
    actor,
    employees,
    units,
    jobTitles: directory.jobTitles,
    people,
    courses,
    exams,
    paths,
    pathCourses,
    rules,
    targets
  };
}

export async function getWorkforceFilterOptions(organizationId: string, profileId: string) {
  await requireWorkforceActor(organizationId, profileId);
  const directory = await getWorkforceDirectory(organizationId);
  const units = directory.units.map((unit) => ({ id: unit.id, name: unit.name }));
  const jobTitles = directory.jobTitles.map((title) => ({ id: title.id, name: title.name }));
  return { units, jobTitles };
}

export async function getWorkforceScopedProfiles(
  organizationId: string,
  profileId: string,
  filters: TWorkforceProfileQuery
) {
  const actor = await requireWorkforceActor(organizationId, profileId);
  if (filters.courseId) {
    const courseOrganizationId = await getOrgIdByCourseId(filters.courseId);
    const canManageCourse = await isCourseTeamMemberOrOrgAdmin(filters.courseId, profileId);
    if (courseOrganizationId !== organizationId || !canManageCourse) fail('workforce.errors.forbidden', 403);
  }

  const scope = filters.courseId ? undefined : workforceActorScope(actor);
  return listWorkforceScopedProfiles(organizationId, filters, scope);
}

function validateEmployeeRelations(
  directory: Awaited<ReturnType<typeof getWorkforceDirectory>>,
  data: { unitId: string | null; jobTitleId: string | null; managerId: string | null },
  employeeId?: string
) {
  if (data.unitId && !directory.units.some((unit) => unit.id === data.unitId)) fail('workforce.errors.unit');
  if (data.jobTitleId && !directory.jobTitles.some((title) => title.id === data.jobTitleId))
    fail('workforce.errors.job_title');
  if (
    data.managerId &&
    !directory.employees.some((employee) => employee.id === data.managerId && employee.status === 'ACTIVE')
  )
    fail('workforce.errors.manager');
  const visited = new Set<string>(employeeId ? [employeeId] : []);
  let managerId = data.managerId ?? directory.units.find((unit) => unit.id === data.unitId)?.leaderId ?? null;
  if (managerId === employeeId && !data.managerId) managerId = null;

  while (managerId) {
    if (visited.has(managerId)) fail('workforce.errors.manager_cycle');

    visited.add(managerId);
    const manager = directory.employees.find((employee) => employee.id === managerId);
    const unitLeaderId = directory.units.find((unit) => unit.id === manager?.unitId)?.leaderId ?? null;
    managerId = manager?.managerId ?? (unitLeaderId === manager?.id ? null : unitLeaderId);
  }
}

export async function reconcileWorkforceTraining(organizationId: string, client: DbOrTxClient) {
  const directory = await getWorkforceDirectory(organizationId, client);
  const catalog = await getWorkforceTrainingCatalog(organizationId, client);
  const existingPaths = await getWorkforceAssignedPaths(organizationId, client);
  for (const employee of directory.employees) {
    if (employee.status === 'SUSPENDED' || employee.status === 'TERMINATED') continue;

    const rules = catalog.rules.filter(
      (rule) =>
        rule.enabled &&
        (!rule.unitId || rule.unitId === employee.unitId) &&
        (!rule.jobTitleId || rule.jobTitleId === employee.jobTitleId)
    );
    const matchingRuleIds = rules.map((rule) => rule.id);
    const targets = catalog.targets.filter((target) => matchingRuleIds.includes(target.ruleId));
    const assignedPathIds = existingPaths
      .filter((assignment) => assignment.employeeId === employee.id)
      .map((assignment) => assignment.pathId);
    const defaultPaths = catalog.paths.filter(
      (path) => path.jobTitleId === employee.jobTitleId || assignedPathIds.includes(path.id)
    );
    const pathTargets = defaultPaths.map((path) => ({ pathId: path.id, courseId: null, examId: null, ruleId: null }));
    for (const target of [...targets, ...pathTargets]) {
      const values = {
        employeeId: employee.id,
        ruleId: target.ruleId,
        courseId: target.courseId,
        examId: target.examId,
        pathId: target.pathId,
        sourceUnitId: employee.unitId,
        sourceJobTitleId: employee.jobTitleId
      };
      await insertWorkforceAssignment(values, employee.profileId, employee.email ?? '', client);
      const pathCourses = target.pathId
        ? catalog.pathCourses.filter((entry) => entry.pathId === target.pathId).map((entry) => entry.courseId)
        : [];
      const examCourseId = target.examId ? catalog.exams.find((exam) => exam.id === target.examId)?.courseId : null;
      for (const courseId of pathCourses) {
        const courseAssignment = { ...values, courseId, examId: null, pathId: null };
        await insertWorkforceAssignment(courseAssignment, employee.profileId, employee.email ?? '', client);
      }
      if (examCourseId) await enrollWorkforceCourse(examCourseId, employee.profileId, employee.email ?? '', client);
    }
  }
}

async function validateWorkforceIdentity(
  organizationId: string,
  profileId: string,
  isSystemAdmin: boolean,
  client: DbOrTxClient
) {
  const memberships = await listWorkforceIdentityOrganizations(profileId, client);
  if (memberships.some((membership) => membership.organizationId !== organizationId))
    fail('workforce.errors.forbidden', 403);
  if (!isSystemAdmin && memberships.some((membership) => membership.roleId === 1))
    fail('workforce.errors.forbidden', 403);
}

export async function createEmployee(organizationId: string, actorId: string, data: TCreateEmployee) {
  const initialPassword = randomBytes(48).toString('hex');
  const passwordHash = await hashAuthPassword(initialPassword);
  const profileId = randomUUID();
  const employee = await workforceTransaction(organizationId, async (transaction) => {
    const actor = await requireWorkforceActor(organizationId, actorId, true, transaction);
    const directory = await getWorkforceDirectory(organizationId, transaction);
    validateEmployeeRelations(directory, data);
    const identityFields = { email: data.email, fullname: data.fullname, profileId, passwordHash };
    const identity = await createWorkforceIdentity(organizationId, identityFields, transaction);
    await validateWorkforceIdentity(organizationId, identity.id, actor.isSystemAdmin, transaction);
    const activatedAt = identity.emailVerified ? new Date().toISOString() : null;
    const values = {
      organizationId,
      employeeCode: data.employeeCode,
      profileId: identity.id,
      unitId: data.unitId,
      jobTitleId: data.jobTitleId,
      managerId: data.managerId,
      accessRole: data.accessRole,
      status: identity.emailVerified ? 'ACTIVE' : 'DRAFT',
      activatedAt
    };
    const created = await insertWorkforceEmployee(values, data.email, transaction);
    await setWorkforceAccess(created, transaction);
    await insertWorkforceHistory(
      {
        organizationId,
        employeeId: created.id,
        actorId,
        event: 'CREATED',
        reason: 'CREATED',
        changes: { employeeCode: created.employeeCode }
      },
      transaction
    );
    await reconcileWorkforceTraining(organizationId, transaction);
    return created;
  });
  const activation =
    data.sendActivation && !employee.activatedAt
      ? await sendEmployeeActivation(organizationId, actorId, employee.id)
      : { queued: false };
  return { employee, activation };
}

export async function importEmployees(organizationId: string, actorId: string, employees: TCreateEmployee[]) {
  await requireWorkforceActor(organizationId, actorId, true);
  const initialPassword = randomBytes(48).toString('hex');
  const passwordHash = await hashAuthPassword(initialPassword);
  const imported = await workforceTransaction(organizationId, async (transaction) => {
    const actor = await requireWorkforceActor(organizationId, actorId, true, transaction);
    const directory = await getWorkforceDirectory(organizationId, transaction);
    const results: {
      employeeCode: string;
      employeeId: string | null;
      success: boolean;
      error: string | null;
      sendActivation: boolean;
    }[] = [];
    for (const data of employees) {
      try {
        const employee = await workforceSavepoint(transaction, async (savepoint) => {
          validateEmployeeRelations(directory, data);
          const profileId = randomUUID();
          const identityFields = { email: data.email, fullname: data.fullname, profileId, passwordHash };
          const identity = await createWorkforceIdentity(organizationId, identityFields, savepoint);
          await validateWorkforceIdentity(organizationId, identity.id, actor.isSystemAdmin, savepoint);
          const activatedAt = identity.emailVerified ? new Date().toISOString() : null;
          const values = {
            organizationId,
            employeeCode: data.employeeCode,
            profileId: identity.id,
            unitId: data.unitId,
            jobTitleId: data.jobTitleId,
            managerId: data.managerId,
            accessRole: data.accessRole,
            status: identity.emailVerified ? 'ACTIVE' : 'DRAFT',
            activatedAt
          };
          const created = await insertWorkforceEmployee(values, data.email, savepoint);
          await setWorkforceAccess(created, savepoint);
          await insertWorkforceHistory(
            {
              organizationId,
              employeeId: created.id,
              actorId,
              event: 'CREATED',
              reason: 'CREATED',
              changes: { employeeCode: created.employeeCode }
            },
            savepoint
          );
          return created;
        });
        results.push({
          employeeCode: employee.employeeCode,
          employeeId: employee.id,
          success: true,
          error: null,
          sendActivation: data.sendActivation && !employee.activatedAt
        });
      } catch (error) {
        const message = error instanceof AppError ? error.message : 'workforce.errors.duplicate';
        results.push({
          employeeCode: data.employeeCode,
          employeeId: null,
          success: false,
          error: message,
          sendActivation: false
        });
      }
    }
    await reconcileWorkforceTraining(organizationId, transaction);
    return results;
  });
  const results: { employeeCode: string; success: boolean; error: string | null; activationQueued: boolean }[] = [];
  for (let index = 0; index < imported.length; index += 20) {
    const batch = imported.slice(index, index + 20);
    const delivered = await Promise.all(
      batch.map(async (row) => {
        let activationQueued = false;
        if (row.success && row.sendActivation && row.employeeId) {
          try {
            const activation = await sendEmployeeActivation(organizationId, actorId, row.employeeId);
            activationQueued = activation.queued;
          } catch (error) {
            console.error('importEmployees activation error:', error);
          }
        }
        return { employeeCode: row.employeeCode, success: row.success, error: row.error, activationQueued };
      })
    );
    results.push(...delivered);
  }
  return results;
}

export async function updateEmployee(
  organizationId: string,
  actorId: string,
  employeeId: string,
  data: TUpdateEmployee
) {
  return workforceTransaction(organizationId, async (transaction) => {
    const actor = await requireWorkforceActor(organizationId, actorId, true, transaction);
    const existing = await getWorkforceEmployee(organizationId, employeeId, transaction);
    if (!existing) fail('workforce.errors.not_found', 404);

    if (data.email) fail('workforce.errors.email_change');
    if (data.status === 'ACTIVE' && !existing.activatedAt) fail('workforce.errors.activation_required');
    if (data.status === 'DRAFT' || data.status === 'PENDING') fail('workforce.errors.invalid_status');
    if (
      existing.profileId === actorId &&
      (data.status === 'SUSPENDED' ||
        data.status === 'TERMINATED' ||
        (data.accessRole && data.accessRole !== existing.accessRole))
    )
      fail('workforce.errors.self_lock');
    const targetActor = await getWorkforceActor(organizationId, existing.profileId, transaction);
    if (targetActor.isSystemAdmin && !actor.isSystemAdmin) fail('workforce.errors.forbidden', 403);

    const directory = await getWorkforceDirectory(organizationId, transaction);
    const unitId = data.unitId === undefined ? existing.unitId : data.unitId;
    const jobTitleId = data.jobTitleId === undefined ? existing.jobTitleId : data.jobTitleId;
    const managerId = data.managerId === undefined ? existing.managerId : data.managerId;
    const relations = { unitId, jobTitleId, managerId };
    validateEmployeeRelations(directory, relations, employeeId);
    const ledUnit = directory.units.find((unit) => unit.leaderId === employeeId);
    if (ledUnit && (unitId !== ledUnit.id || (data.status && data.status !== 'ACTIVE')))
      fail('workforce.errors.replace_leader');
    if (
      data.status &&
      data.status !== 'ACTIVE' &&
      directory.employees.some((employee) => employee.managerId === employeeId && employee.status === 'ACTIVE')
    )
      fail('workforce.errors.replace_manager');

    const values = {
      ...relations,
      ...(data.accessRole ? { accessRole: data.accessRole } : {}),
      ...(data.status ? { status: data.status } : {})
    };
    const updated = await updateWorkforceEmployeeRow(organizationId, employeeId, values, transaction);
    await updateWorkforceProfile(existing.profileId, data.fullname, transaction);
    await setWorkforceAccess(updated, transaction);
    const changes = {
      before: {
        unitId: existing.unitId,
        jobTitleId: existing.jobTitleId,
        managerId: existing.managerId,
        status: existing.status,
        accessRole: existing.accessRole
      },
      after: values
    };
    await insertWorkforceHistory(
      { organizationId, employeeId, actorId, event: 'UPDATED', reason: data.reason, changes },
      transaction
    );
    await reconcileWorkforceTraining(organizationId, transaction);
    return updated;
  });
}

export async function saveUnit(organizationId: string, actorId: string, data: TWorkforceUnit, resourceId?: string) {
  return workforceTransaction(organizationId, async (transaction) => {
    const actor = await requireWorkforceActor(organizationId, actorId, true, transaction);
    const directory = await getWorkforceDirectory(organizationId, transaction);
    const leader = directory.employees.find(
      (employee) => employee.id === data.leaderId && employee.status === 'ACTIVE'
    );
    if (!leader) fail('workforce.errors.leader');
    await validateWorkforceIdentity(organizationId, leader.profileId, actor.isSystemAdmin, transaction);
    if (resourceId && !directory.units.some((unit) => unit.id === resourceId)) fail('workforce.errors.not_found', 404);
    if (directory.units.some((unit) => unit.leaderId === leader.id && unit.id !== resourceId))
      fail('workforce.errors.replace_leader');

    const unit = await saveWorkforceUnit({ ...data, organizationId }, resourceId, transaction);
    const updatedDirectory = {
      ...directory,
      units: [...directory.units.filter((entry) => entry.id !== unit.id), unit]
    };
    const leaderRelations = { unitId: unit.id, jobTitleId: leader.jobTitleId, managerId: leader.managerId };
    validateEmployeeRelations(updatedDirectory, leaderRelations, leader.id);
    await updateWorkforceEmployeeRow(organizationId, leader.id, { unitId: unit.id }, transaction);
    const changes = {
      unitId: unit.id,
      before: directory.units.find((entry) => entry.id === unit.id) ?? null,
      after: data,
      previousUnitId: leader.unitId
    };
    await insertWorkforceHistory(
      {
        organizationId,
        employeeId: leader.id,
        actorId,
        event: 'UNIT_LEADER_CHANGED',
        reason: 'UNIT_LEADER_CHANGED',
        changes
      },
      transaction
    );
    await reconcileWorkforceTraining(organizationId, transaction);
    return unit;
  });
}

export async function saveJobTitle(organizationId: string, actorId: string, data: TJobTitle, resourceId?: string) {
  return workforceTransaction(organizationId, async (transaction) => {
    await requireWorkforceActor(organizationId, actorId, true, transaction);
    const saved = await saveWorkforceJobTitle({ ...data, organizationId }, resourceId, transaction);
    if (!saved) fail('workforce.errors.not_found', 404);

    await insertWorkforceHistory(
      {
        organizationId,
        actorId,
        event: 'JOB_TITLE_SAVED',
        reason: 'JOB_TITLE_SAVED',
        changes: { resourceId: saved.id, ...data }
      },
      transaction
    );
    return saved;
  });
}

export async function saveTrainingConfiguration(
  organizationId: string,
  actorId: string,
  kind: 'rule',
  data: TTrainingRule,
  resourceId?: string
): Promise<{ id: string }>;
export async function saveTrainingConfiguration(
  organizationId: string,
  actorId: string,
  kind: 'path',
  data: TLearningPath,
  resourceId?: string
): Promise<{ id: string }>;
export async function saveTrainingConfiguration(
  organizationId: string,
  actorId: string,
  kind: 'rule' | 'path',
  data: TTrainingRule | TLearningPath,
  resourceId?: string
) {
  return workforceTransaction(organizationId, async (transaction) => {
    await requireWorkforceActor(organizationId, actorId, true, transaction);
    const directory = await getWorkforceDirectory(organizationId, transaction);
    const catalog = await getWorkforceTrainingCatalog(organizationId, transaction);
    if (data.jobTitleId && !directory.jobTitles.some((title) => title.id === data.jobTitleId))
      fail('workforce.errors.job_title');
    if (data.courseIds.some((id) => !catalog.courses.some((course) => course.id === id)))
      fail('workforce.errors.training_target');
    if (new Set(data.courseIds).size !== data.courseIds.length) fail('workforce.errors.duplicate');
    if (kind === 'rule') {
      const rule = data as TTrainingRule;
      if (rule.unitId && !directory.units.some((unit) => unit.id === rule.unitId)) fail('workforce.errors.unit');
      if (
        rule.examIds.some((id) => !catalog.exams.some((exam) => exam.id === id)) ||
        rule.pathIds.some((id) => !catalog.paths.some((path) => path.id === id))
      )
        fail('workforce.errors.training_target');
    }
    const saved =
      kind === 'rule'
        ? await saveWorkforceTrainingRule(organizationId, data as TTrainingRule, resourceId, transaction)
        : await saveWorkforceLearningPath(organizationId, data as TLearningPath, resourceId, transaction);
    if (!saved) fail('workforce.errors.not_found', 404);

    await insertWorkforceHistory(
      {
        organizationId,
        actorId,
        event: kind === 'rule' ? 'RULE_SAVED' : 'PATH_SAVED',
        reason: 'TRAINING_CONFIGURATION',
        changes: { resourceId: saved.id, ...data }
      },
      transaction
    );
    await reconcileWorkforceTraining(organizationId, transaction);
    return saved;
  });
}

export async function sendEmployeeActivation(organizationId: string, actorId: string, employeeId: string) {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const result = await workforceTransaction(organizationId, async (transaction) => {
    await requireWorkforceActor(organizationId, actorId, true, transaction);
    const employee = await getWorkforceEmployeeIdentity(organizationId, employeeId, transaction);
    if (!employee || !employee.email) fail('workforce.errors.not_found', 404);
    if (employee.activatedAt || !['DRAFT', 'PENDING'].includes(employee.status))
      fail('workforce.errors.invalid_status');

    const activation = await issueWorkforceActivation(employeeId, tokenHash, expiresAt, transaction);
    await updateWorkforceEmployeeRow(organizationId, employeeId, { status: 'PENDING' }, transaction);
    await insertWorkforceHistory(
      {
        organizationId,
        employeeId,
        actorId,
        event: 'ACTIVATION_REQUESTED',
        reason: 'ACTIVATION_REQUESTED',
        changes: { expiresAt }
      },
      transaction
    );
    return { employee, activationId: activation.id };
  });
  const organization = await getOrganizationById(organizationId);
  const baseUrl = getDashboardBaseUrl(organization ?? undefined);
  const link = `${baseUrl}/activate?token=${encodeURIComponent(token)}`;
  const fields = { name: result.employee.fullname, employeeCode: result.employee.employeeCode, link };
  try {
    const queued = await enqueueTransactionalEmail('employeeActivation', {
      to: result.employee.email!,
      fields,
      idempotencyKey: result.activationId,
      organizationId
    });
    return { queued: queued.jobIds.length > 0 };
  } catch (error) {
    console.error('sendEmployeeActivation error:', error);
    return { queued: false };
  }
}

export async function previewEmployeeActivation(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await findWorkforceActivation(tokenHash);
  if (
    !result ||
    new Date(result.activation.expiresAt).getTime() <= Date.now() ||
    !['DRAFT', 'PENDING'].includes(result.employee.status)
  )
    fail('workforce.errors.activation_invalid');

  return {
    fullname: result.fullname,
    employeeCode: result.employee.employeeCode,
    expiresAt: result.activation.expiresAt
  };
}

export async function activateEmployee(token: string, password: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await findWorkforceActivation(tokenHash);
  if (!result) fail('workforce.errors.activation_invalid');

  const passwordHash = await hashAuthPassword(password);
  return workforceTransaction(result.employee.organizationId, async (transaction) => {
    const current = await findWorkforceActivation(tokenHash, transaction);
    if (!current || !['DRAFT', 'PENDING'].includes(current.employee.status))
      fail('workforce.errors.activation_invalid');

    const employee = await consumeWorkforceActivation(
      current.activation.id,
      current.employee,
      passwordHash,
      transaction
    );
    if (!employee) fail('workforce.errors.activation_invalid');

    await insertWorkforceHistory(
      {
        organizationId: employee.organizationId,
        employeeId: employee.id,
        actorId: employee.profileId,
        event: 'ACTIVATED',
        reason: 'ACTIVATED',
        changes: {}
      },
      transaction
    );
    await reconcileWorkforceTraining(employee.organizationId, transaction);
    return { employeeCode: employee.employeeCode };
  });
}

export async function getEmployeeHistory(organizationId: string, profileId: string, employeeId: string) {
  const actor = await requireWorkforceActor(organizationId, profileId);
  const employee = await getWorkforceEmployee(organizationId, employeeId);
  if (
    !employee ||
    (!actor.canManage &&
      employee.id !== actor.employeeId &&
      !actor.unitIds.includes(employee.unitId ?? '') &&
      !actor.reportIds.includes(employee.id))
  )
    fail('workforce.errors.forbidden', 403);

  return listWorkforceHistory(organizationId, employeeId);
}

export async function getEmployeeAssignments(organizationId: string, profileId: string) {
  await requireWorkforceActor(organizationId, profileId);
  const scope = workforceProfileScope(profileId);
  const assignments = await getWorkforceAssignments(organizationId, scope);
  const catalog = await getWorkforceTrainingCatalog(organizationId);
  const paths = assignments
    .filter((row) => row.assignment.pathId)
    .map((row) => {
      const entries = catalog.pathCourses
        .filter((entry) => entry.pathId === row.assignment.pathId)
        .map((entry) => {
          const title = catalog.courses.find((course) => course.id === entry.courseId)?.title ?? '';
          const complete = assignments.some(
            (assignment) => assignment.assignment.courseId === entry.courseId && assignment.complete
          );
          return { ...entry, title, complete };
        });
      return { id: row.assignment.pathId!, name: row.pathName, courses: entries };
    });
  return { assignments, paths };
}

export async function getWorkforceReport(organizationId: string, profileId: string, filters: TWorkforceFilters) {
  const actor = await requireWorkforceActor(organizationId, profileId);
  if (!actor.canManage && !actor.unitIds.length && !actor.reportIds.length) fail('workforce.errors.forbidden', 403);

  const scope = workforceActorScope(actor);
  const directory = await getWorkforceDirectory(organizationId);
  const assignments = await getWorkforceAssignments(organizationId, scope);
  const search = filters.search.trim().toLowerCase();
  return directory.units
    .filter(
      (unit) =>
        (!filters.unitId || unit.id === filters.unitId) &&
        (actor.canManage ||
          actor.unitIds.includes(unit.id) ||
          directory.employees.some((employee) => employee.unitId === unit.id && actor.reportIds.includes(employee.id)))
    )
    .map((unit) => {
      const people = directory.employees.filter(
        (employee) =>
          employee.unitId === unit.id &&
          employee.status === 'ACTIVE' &&
          (!filters.jobTitleId || employee.jobTitleId === filters.jobTitleId) &&
          (!search ||
            `${employee.employeeCode} ${employee.fullname} ${employee.email ?? ''} ${unit.name} ${directory.jobTitles.find((title) => title.id === employee.jobTitleId)?.name ?? ''}`
              .toLowerCase()
              .includes(search)) &&
          (actor.canManage || actor.unitIds.includes(unit.id) || actor.reportIds.includes(employee.id))
      );
      const employeeIds = people.map((employee) => employee.id);
      const rows = assignments.filter((row) => employeeIds.includes(row.employee.id) && !row.assignment.pathId);
      const completed = rows.filter((row) => row.complete).length;
      const completionRate = rows.length ? Math.round((completed / rows.length) * 100) : null;
      return {
        unitId: unit.id,
        unit: unit.name,
        employees: people.length,
        assigned: rows.length,
        completed,
        remaining: rows.length - completed,
        completionRate
      };
    })
    .filter((unit) => !search || unit.employees > 0 || unit.unit.toLowerCase().includes(search));
}

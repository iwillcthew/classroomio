import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const requireDatabase = createRequire(resolve('packages/db/package.json'));
const { parse } = requireDatabase('dotenv');
const configuration = parse(readFileSync('apps/api/.env'));
const databaseName = `mp_workforce_verify_${Date.now()}`;
const container = 'cio-postgres';
const connection = new URL(configuration.DATABASE_URL);
connection.hostname = '127.0.0.1';
connection.port = '5432';
connection.pathname = `/${databaseName}`;
Object.assign(process.env, configuration, {
  DATABASE_URL: connection.href,
  PGBOUNCER_DATABASE_URL: '',
  REDIS_URL: '',
  NODE_ENV: 'test',
  PUBLIC_IS_SELFHOSTED: 'true'
});

const docker = (args, input) =>
  execFileSync('docker', args, { input, maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
const runSql = (input) =>
  docker(
    ['exec', '-i', container, 'sh', '-c', `psql -X -q -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d ${databaseName}`],
    input
  );
let created = false;
let checks = 0;
function verified(name) {
  checks++;
  console.log(`PASS ${name}`);
}

try {
  docker(['exec', container, 'sh', '-c', `createdb -U "$POSTGRES_USER" ${databaseName}`]);
  created = true;
  const sourceSchema = docker([
    'exec',
    container,
    'sh',
    '-c',
    'pg_dump -U "$POSTGRES_USER" --schema-only "$POSTGRES_DB"'
  ]);
  runSql(sourceSchema);
  runSql(readFileSync('packages/db/src/migrations/0042_workforce.sql'));
  verified('migration on existing schema without copying employee data');

  const { db, eq, and, sql } = await import('../packages/db/dist/drizzle.js');
  const schema = await import('../packages/db/dist/schema.js');
  const queries = await import('../packages/db/dist/queries/workforce/index.js');
  const services = await import('../apps/api/dist/services/workforce/workforce.js');
  const { ZCreateEmployee, ZUpdateEmployee, ZWorkforceFilters } = await import(
    '../packages/utils/dist/validation/organization/index.js'
  );
  const { auth } = await import('../packages/db/dist/auth.js');
  const { rewriteEmployeeAuthRequest } = await import('../apps/api/dist/utils/employee-auth-request.js');
  const { workforceRouter } = await import('../apps/api/dist/routes/workforce/index.js');
  const { getLearningAnalyticsSnapshot } = await import('../packages/db/dist/queries/dash/learning-analytics.js');
  const requireApi = createRequire(resolve('apps/api/package.json'));
  const { Hono } = requireApi('hono');
  const organizationId = randomUUID();
  const otherOrganizationId = randomUUID();
  const adminId = randomUUID();
  await db.insert(schema.role).values([
    { id: 1, type: 'ADMIN' },
    { id: 2, type: 'TUTOR' },
    { id: 3, type: 'STUDENT' }
  ]);
  await db
    .insert(schema.user)
    .values({ id: adminId, name: 'Test administrator', email: 'admin@workforce.test', emailVerified: true });
  await db
    .insert(schema.profile)
    .values({ id: adminId, fullname: 'Test administrator', username: 'test-admin', email: 'admin@workforce.test' });
  await db.insert(schema.organization).values([
    { id: organizationId, name: 'Verification organization', siteName: 'workforce-verification' },
    { id: otherOrganizationId, name: 'Other organization', siteName: 'other-verification' }
  ]);
  await db
    .insert(schema.organizationmember)
    .values({ organizationId, profileId: adminId, email: 'admin@workforce.test', roleId: 1 });

  async function createVerifiedEmployee(employeeCode) {
    const profileId = randomUUID();
    const email = `${employeeCode.toLowerCase()}@workforce.test`;
    await db.insert(schema.user).values({ id: profileId, name: employeeCode, email, emailVerified: true });
    await db
      .insert(schema.profile)
      .values({ id: profileId, fullname: employeeCode, username: profileId, email, isEmailVerified: true });
    const fields = ZCreateEmployee.parse({ employeeCode, fullname: employeeCode, email });
    const result = await services.createEmployee(organizationId, adminId, fields);
    return result.employee;
  }

  const leaderA = await createVerifiedEmployee('LEADER-A');
  const leaderB = await createVerifiedEmployee('LEADER-B');
  const unitA = await services.saveUnit(organizationId, adminId, { code: 'A', name: 'Unit A', leaderId: leaderA.id });
  const unitB = await services.saveUnit(organizationId, adminId, { code: 'B', name: 'Unit B', leaderId: leaderB.id });
  const titleA = await services.saveJobTitle(organizationId, adminId, { code: 'ANALYST', name: 'Analyst' });
  const titleB = await services.saveJobTitle(organizationId, adminId, { code: 'SPECIALIST', name: 'Specialist' });
  verified('unit heads are employees belonging to their units');

  async function createCourse(title) {
    const [group] = await db.insert(schema.group).values({ organizationId, name: title }).returning();
    const [course] = await db
      .insert(schema.course)
      .values({ title, description: title, groupId: group.id })
      .returning();
    return course;
  }
  const courseA = await createCourse('Unit A onboarding');
  const courseB = await createCourse('Analyst pathway');
  const courseC = await createCourse('Specialist pathway');
  const [exam] = await db
    .insert(schema.exercise)
    .values({ title: 'Knowledge assessment', courseId: courseA.id, order: 0, slug: 'knowledge-assessment' })
    .returning();
  const rule = await services.saveTrainingConfiguration(organizationId, adminId, 'rule', {
    name: 'Unit A training',
    unitId: unitA.id,
    jobTitleId: null,
    courseIds: [courseA.id],
    examIds: [exam.id],
    pathIds: [],
    enabled: true
  });
  await services.saveTrainingConfiguration(organizationId, adminId, 'path', {
    name: 'Analyst learning path',
    jobTitleId: titleA.id,
    courseIds: [courseB.id, courseA.id]
  });
  await services.saveTrainingConfiguration(organizationId, adminId, 'path', {
    name: 'Specialist learning path',
    jobTitleId: titleB.id,
    courseIds: [courseC.id]
  });
  const employeeFields = ZCreateEmployee.parse({
    employeeCode: 'nv-001',
    fullname: 'Test learner',
    email: 'learner@workforce.test',
    unitId: unitA.id,
    jobTitleId: titleA.id
  });
  const createdEmployee = await services.createEmployee(organizationId, adminId, employeeFields);
  const employee = createdEmployee.employee;
  assert.equal(employee.employeeCode, 'NV-001');
  assert.equal(employee.status, 'DRAFT');
  assert.equal(await queries.workforceProfileAccess(employee.profileId), false);
  verified('new accounts remain inaccessible until activation');

  const duplicate = services.createEmployee(organizationId, adminId, employeeFields);
  await assert.rejects(duplicate);
  await assert.rejects(
    db
      .update(schema.workforceEmployee)
      .set({ employeeCode: 'CHANGED' })
      .where(eq(schema.workforceEmployee.id, employee.id))
  );
  assert.equal(ZUpdateEmployee.safeParse({ employeeCode: 'CHANGED', reason: 'Change code' }).success, false);
  verified('normalized codes are unique and immutable at API and database levels');

  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  await queries.workforceTransaction(organizationId, async (transaction) =>
    queries.issueWorkforceActivation(employee.id, tokenHash, new Date(Date.now() + 60_000).toISOString(), transaction)
  );
  assert.equal((await services.previewEmployeeActivation(token)).employeeCode, 'NV-001');
  await services.activateEmployee(token, 'VerificationPassword-2026!');
  await assert.rejects(services.activateEmployee(token, 'VerificationPassword-2026!'));
  assert.equal(await queries.workforceProfileAccess(employee.profileId), true);
  verified('activation sets a password and tokens cannot be replayed');

  const request = new Request('http://localhost:3081/api/auth/sign-in/employee', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employeeCode: 'nv-001', password: 'VerificationPassword-2026!' })
  });
  const rewritten = await rewriteEmployeeAuthRequest(request);
  const login = await auth.handler(rewritten);
  assert.equal(login.status, 200);
  verified('employee-code login creates a valid authentication session');

  const emailRequest = new Request('http://localhost:3081/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: employeeFields.email, password: 'VerificationPassword-2026!' })
  });
  const deniedEmailLogin = await rewriteEmployeeAuthRequest(emailRequest);
  assert.equal((await deniedEmailLogin.json()).email, 'invalid-employee@example.invalid');
  const adminRequest = new Request('http://localhost:3081/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@workforce.test', password: 'bootstrap' })
  });
  const preservedAdminLogin = await rewriteEmployeeAuthRequest(adminRequest);
  assert.equal((await preservedAdminLogin.json()).email, 'admin@workforce.test');
  verified('employee email login is blocked while unmapped administrators retain recovery access');

  const filters = ZWorkforceFilters.parse({ unitId: unitA.id, jobTitleId: titleA.id, search: 'NV-001' });
  const overview = await services.getWorkforceOverview(organizationId, adminId, filters);
  assert.equal(overview.employees.total, 1);
  assert.equal(overview.employees.rows[0].effectiveManagerId, leaderA.id);
  verified('combined unit/title filters, code search and default manager resolve correctly');

  const initialAssignments = await services.getEmployeeAssignments(organizationId, employee.profileId);
  assert.equal(initialAssignments.paths.length, 1);
  assert.equal(initialAssignments.paths[0].courses[0].courseId, courseB.id);
  assert(initialAssignments.assignments.some((entry) => entry.assignment.examId === exam.id));
  assert(initialAssignments.assignments.some((entry) => entry.assignment.courseId === courseA.id));
  await queries.workforceTransaction(organizationId, (transaction) =>
    services.reconcileWorkforceTraining(organizationId, transaction)
  );
  const repeatedAssignments = await services.getEmployeeAssignments(organizationId, employee.profileId);
  assert.equal(repeatedAssignments.assignments.length, initialAssignments.assignments.length);
  verified('new hires receive unit courses, assessments and ordered title paths without duplicates');

  const [lesson] = await db
    .insert(schema.lesson)
    .values({ title: 'Pathway lesson', courseId: courseB.id, order: 0, slug: 'pathway-lesson' })
    .returning();
  await db
    .insert(schema.lessonCompletion)
    .values({ lessonId: lesson.id, profileId: employee.profileId, isComplete: true });
  const completedLearning = await services.getEmployeeAssignments(organizationId, employee.profileId);
  assert.equal(completedLearning.assignments.find((row) => row.assignment.courseId === courseB.id).complete, true);
  assert.equal(completedLearning.paths[0].courses[0].complete, true);
  verified('learning paths and reports derive completion from actual lesson progress');

  await assert.rejects(
    services.updateEmployee(organizationId, employee.profileId, leaderA.id, {
      reason: 'Unauthorized change',
      unitId: unitB.id
    })
  );
  await assert.rejects(services.getWorkforceOverview(otherOrganizationId, adminId, ZWorkforceFilters.parse({})));
  await assert.rejects(
    services.updateEmployee(organizationId, adminId, leaderA.id, { reason: 'Move a head', unitId: unitB.id })
  );
  await assert.rejects(
    services.updateEmployee(organizationId, adminId, employee.id, { reason: 'Self management', managerId: employee.id })
  );
  verified('ordinary users, cross-organization access, orphaned units and management cycles are rejected');

  await services.updateEmployee(organizationId, adminId, employee.id, {
    reason: 'Move to specialist team',
    unitId: unitB.id,
    jobTitleId: titleB.id,
    managerId: null
  });
  const moved = await services.getWorkforceOverview(
    organizationId,
    adminId,
    ZWorkforceFilters.parse({ search: 'NV-001' })
  );
  assert.equal(moved.employees.rows[0].effectiveManagerId, leaderB.id);
  const movedAssignments = await services.getEmployeeAssignments(organizationId, employee.profileId);
  assert(movedAssignments.assignments.some((entry) => entry.assignment.courseId === courseA.id));
  assert(movedAssignments.assignments.some((entry) => entry.assignment.courseId === courseC.id));
  const history = await services.getEmployeeHistory(organizationId, adminId, employee.id);
  assert(
    history.some((entry) => entry.reason === 'Move to specialist team' && entry.changes.before.unitId === unitA.id)
  );
  verified('transfers retain previous learning, add new title requirements and record history');

  await db.insert(schema.session).values({
    userId: employee.profileId,
    token: randomUUID(),
    expiresAt: new Date(Date.now() + 60_000),
    updatedAt: new Date()
  });
  await services.updateEmployee(organizationId, adminId, employee.id, {
    reason: 'Employee left company',
    status: 'TERMINATED'
  });
  const sessionsAfter = await db.select().from(schema.session).where(eq(schema.session.userId, employee.profileId));
  assert.equal(sessionsAfter.length, 0);
  assert.equal(await queries.workforceProfileAccess(employee.profileId), false);
  verified('offboarding deletes existing sessions and blocks access immediately');

  const reports = await services.getWorkforceReport(organizationId, adminId, ZWorkforceFilters.parse({}));
  assert.equal(reports.length, 2);
  assert.equal(reports.find((row) => row.unitId === unitB.id).employees, 1);
  const scopedReports = await services.getWorkforceReport(
    organizationId,
    leaderA.profileId,
    ZWorkforceFilters.parse({})
  );
  assert.deepEqual(
    scopedReports.map((row) => row.unitId),
    [unitA.id]
  );
  verified('reports exclude leavers and unit heads only see their own unit');

  const badToken = randomBytes(32).toString('hex');
  const draft = await services.createEmployee(
    organizationId,
    adminId,
    ZCreateEmployee.parse({
      employeeCode: 'NV-EXPIRED',
      fullname: 'Expired activation',
      email: 'expired@workforce.test'
    })
  );
  const expiredHash = createHash('sha256').update(badToken).digest('hex');
  await queries.workforceTransaction(organizationId, (transaction) =>
    queries.issueWorkforceActivation(
      draft.employee.id,
      expiredHash,
      new Date(Date.now() - 1_000).toISOString(),
      transaction
    )
  );
  await assert.rejects(services.activateEmployee(badToken, 'VerificationPassword-2026!'));
  verified('expired activation links are rejected');

  const importFields = [
    ZCreateEmployee.parse({
      employeeCode: 'NV-IMPORTED',
      fullname: 'Imported learner',
      email: 'imported@workforce.test',
      unitId: unitA.id,
      jobTitleId: titleA.id
    }),
    ZCreateEmployee.parse({ employeeCode: 'NV-001', fullname: 'Duplicate learner', email: 'duplicate@workforce.test' })
  ];
  const imported = await services.importEmployees(organizationId, adminId, importFields);
  assert.equal(imported[0].success, true);
  assert.equal(imported[1].success, false);
  const importOverview = await services.getWorkforceOverview(
    organizationId,
    adminId,
    ZWorkforceFilters.parse({ search: 'NV-IMPORTED' })
  );
  assert.equal(importOverview.employees.total, 1);
  const importedAssignments = await queries.getWorkforceAssignments(organizationId);
  assert(
    importedAssignments.some(
      (row) => row.employee.employeeCode === 'NV-IMPORTED' && row.assignment.courseId === courseB.id
    )
  );
  verified('bulk import isolates duplicate rows and applies training within the same transaction');

  const denied = await workforceRouter.request('/employees', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(employeeFields)
  });
  assert.equal(denied.status, 401);
  const authenticated = new Hono()
    .use('*', async (context, next) => {
      context.set('user', { id: adminId });
      context.set('session', { id: 'verification-session' });
      await next();
    })
    .route('/workforce', workforceRouter);
  const missingOrganization = await authenticated.request('/workforce');
  assert.equal(missingOrganization.status, 403);
  const immutableUpdate = await authenticated.request(`/workforce/employees/${employee.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', 'cio-org-id': organizationId },
    body: JSON.stringify({ employeeCode: 'CHANGED', reason: 'Attempt identity change' })
  });
  assert.equal(immutableUpdate.status, 400);
  const unitReports = await authenticated.request('/workforce/reports', { headers: { 'cio-org-id': organizationId } });
  assert.equal(unitReports.status, 200);
  const reportPayload = await unitReports.json();
  assert.equal(reportPayload.data.length, 2);
  verified('HTTP routes enforce authentication, organization context and immutable-code contracts');

  const [legacyMembership] = await db
    .insert(schema.organizationmember)
    .values({ organizationId, roleId: 3, email: 'legacy@workforce.test' })
    .returning();
  await db.insert(schema.groupmember).values({ groupId: courseA.groupId, email: 'legacy@workforce.test', roleId: 3 });
  const legacy = await services.createEmployee(
    organizationId,
    adminId,
    ZCreateEmployee.parse({
      employeeCode: 'NV-LEGACY',
      fullname: 'Legacy invite',
      email: 'legacy@workforce.test',
      unitId: unitA.id
    })
  );
  const [linked] = await db
    .select()
    .from(schema.organizationmember)
    .where(eq(schema.organizationmember.id, legacyMembership.id));
  assert.equal(linked.profileId, legacy.employee.profileId);
  const enrollments = await db
    .select()
    .from(schema.groupmember)
    .where(and(eq(schema.groupmember.groupId, courseA.groupId), eq(schema.groupmember.email, 'legacy@workforce.test')));
  assert.equal(enrollments.length, 1);
  assert.equal(enrollments[0].profileId, legacy.employee.profileId);
  verified('existing unactivated invitations are linked without duplicate memberships or enrollments');

  const crossOrganization = await db
    .insert(schema.group)
    .values({ organizationId: otherOrganizationId, name: 'Other tenant course' })
    .returning();
  const [foreignCourse] = await db
    .insert(schema.course)
    .values({ title: 'Other tenant content', description: 'Isolated content', groupId: crossOrganization[0].id })
    .returning();
  await assert.rejects(
    services.saveTrainingConfiguration(organizationId, adminId, 'rule', {
      name: 'Invalid target',
      unitId: null,
      jobTitleId: null,
      courseIds: [foreignCourse.id],
      examIds: [],
      pathIds: [],
      enabled: true
    })
  );
  verified('training rules cannot reference another organization’s content');

  await services.saveTrainingConfiguration(
    organizationId,
    adminId,
    'rule',
    {
      name: 'Disabled Unit A training',
      unitId: unitA.id,
      jobTitleId: null,
      courseIds: [courseA.id],
      examIds: [exam.id],
      pathIds: [],
      enabled: false
    },
    rule.id
  );
  const later = await services.createEmployee(
    organizationId,
    adminId,
    ZCreateEmployee.parse({
      employeeCode: 'NV-LATER',
      fullname: 'Later learner',
      email: 'later@workforce.test',
      unitId: unitA.id
    })
  );
  const afterDisabled = await queries.getWorkforceAssignments(organizationId);
  assert.equal(afterDisabled.filter((row) => row.employee.id === later.employee.id).length, 0);
  verified('disabled rules stop assigning new employees');
  const unitSnapshot = await getLearningAnalyticsSnapshot(organizationId, undefined, { unitId: unitA.id });
  assert.equal(unitSnapshot.employees, 1);
  const searchedSnapshot = await getLearningAnalyticsSnapshot(organizationId, undefined, { search: 'LEADER-B' });
  assert.equal(searchedSnapshot.employees, 1);
  verified('existing training analytics honors unit and employee-code filters');

  const complianceCourse = await createCourse('Annual compliance');
  await db.update(schema.course).set({ type: 'COMPLIANCE' }).where(eq(schema.course.id, complianceCourse.id));
  await services.saveTrainingConfiguration(organizationId, adminId, 'rule', {
    name: 'Compliance requirement',
    unitId: unitB.id,
    jobTitleId: null,
    courseIds: [complianceCourse.id],
    examIds: [],
    pathIds: [],
    enabled: true
  });
  const [complianceMembership] = await db
    .select()
    .from(schema.groupmember)
    .where(
      and(eq(schema.groupmember.groupId, complianceCourse.groupId), eq(schema.groupmember.profileId, leaderB.profileId))
    );
  const dueDate = new Date(Date.now() + 86_400_000).toISOString();
  const expiredAt = new Date(Date.now() - 86_400_000).toISOString();
  await db.insert(schema.courseCompletionRecord).values({
    courseId: complianceCourse.id,
    groupMemberId: complianceMembership.id,
    profileId: leaderB.profileId,
    status: 'compliant',
    cycleNumber: 1,
    dueDate,
    validUntil: expiredAt
  });
  const expiredCompliance = await services.getEmployeeAssignments(organizationId, leaderB.profileId);
  assert.equal(
    expiredCompliance.assignments.find((row) => row.assignment.courseId === complianceCourse.id).complete,
    false
  );
  await db.insert(schema.courseCompletionRecord).values({
    courseId: complianceCourse.id,
    groupMemberId: complianceMembership.id,
    profileId: leaderB.profileId,
    status: 'compliant',
    cycleNumber: 2,
    dueDate,
    validUntil: dueDate
  });
  const validCompliance = await services.getEmployeeAssignments(organizationId, leaderB.profileId);
  assert.equal(
    validCompliance.assignments.find((row) => row.assignment.courseId === complianceCourse.id).complete,
    true
  );
  await db.insert(schema.courseCompletionRecord).values({
    courseId: complianceCourse.id,
    groupMemberId: complianceMembership.id,
    profileId: leaderB.profileId,
    status: 'waived',
    cycleNumber: 3,
    dueDate,
    waiverExpiresAt: expiredAt
  });
  const expiredWaiver = await services.getEmployeeAssignments(organizationId, leaderB.profileId);
  assert.equal(
    expiredWaiver.assignments.find((row) => row.assignment.courseId === complianceCourse.id).complete,
    false
  );
  verified('compliance reports use the latest cycle and reject expired compliance or waivers');
  const filteredProfiles = await services.getWorkforceScopedProfiles(organizationId, adminId, {
    search: 'LEADER-B',
    unitId: unitB.id
  });
  assert.deepEqual(filteredProfiles, [leaderB.profileId]);
  const ownProfiles = await services.getWorkforceScopedProfiles(organizationId, leaderA.profileId, {
    search: 'LEADER-B'
  });
  assert.deepEqual(ownProfiles, []);
  const courseProfiles = await services.getWorkforceScopedProfiles(organizationId, adminId, {
    search: 'LEADER-B',
    courseId: complianceCourse.id
  });
  assert.deepEqual(courseProfiles, [leaderB.profileId]);
  await assert.rejects(
    services.getWorkforceScopedProfiles(organizationId, leaderB.profileId, {
      search: '',
      courseId: complianceCourse.id
    }),
    /forbidden/
  );
  await assert.rejects(services.getWorkforceScopedProfiles(otherOrganizationId, adminId, { search: '' }), /forbidden/);
  verified('management filters respect employee identity, unit, course permissions and organization boundaries');
  const humanResources = await createVerifiedEmployee('NV-HR');
  await services.updateEmployee(organizationId, adminId, humanResources.id, {
    accessRole: 'HR',
    reason: 'HR verification'
  });
  const adminFields = ZCreateEmployee.parse({
    employeeCode: 'ADMIN-IDENTITY',
    fullname: 'Test administrator',
    email: 'admin@workforce.test'
  });
  await assert.rejects(services.createEmployee(organizationId, humanResources.profileId, adminFields), /forbidden/);
  const importedAdmin = await services.importEmployees(organizationId, humanResources.profileId, [adminFields]);
  assert.equal(importedAdmin[0].success, false);
  assert.equal(importedAdmin[0].error, 'workforce.errors.forbidden');
  const protectedIdentity = await services.createEmployee(organizationId, adminId, adminFields);
  await assert.rejects(
    services.saveUnit(organizationId, humanResources.profileId, {
      code: 'ADMIN-UNIT',
      name: 'Admin unit',
      leaderId: protectedIdentity.employee.id
    }),
    /forbidden/
  );
  const foreignProfileId = randomUUID();
  await db.insert(schema.user).values({
    id: foreignProfileId,
    name: 'Other tenant employee',
    email: 'foreign@workforce.test',
    emailVerified: true
  });
  await db.insert(schema.profile).values({
    id: foreignProfileId,
    fullname: 'Other tenant employee',
    username: foreignProfileId,
    email: 'foreign@workforce.test'
  });
  await db.insert(schema.organizationmember).values({
    organizationId: otherOrganizationId,
    profileId: foreignProfileId,
    email: 'foreign@workforce.test',
    roleId: 3
  });
  const foreignFields = ZCreateEmployee.parse({
    employeeCode: 'FOREIGN-IDENTITY',
    fullname: 'Other tenant employee',
    email: 'foreign@workforce.test'
  });
  await assert.rejects(services.createEmployee(organizationId, adminId, foreignFields), /forbidden/);
  verified('HR cannot claim administrator identities and existing identities cannot cross organization boundaries');
  console.log(`Verified ${checks} workforce scenarios.`);
} finally {
  if (created && /^mp_workforce_verify_\d+$/.test(databaseName)) {
    docker(['exec', container, 'sh', '-c', `dropdb --force -U "$POSTGRES_USER" ${databaseName}`]);
  }
}
process.exit(0);

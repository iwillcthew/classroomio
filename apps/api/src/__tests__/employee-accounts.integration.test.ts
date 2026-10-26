import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cio/email', async (importOriginal) => {
  const original = await importOriginal<typeof import('@cio/email')>();
  return { ...original, deliverEmail: vi.fn(async () => [{ success: true }]) };
});

const testDatabaseUrl = process.env.EMPLOYEE_TEST_DATABASE_URL;
const integration = testDatabaseUrl ? describe : describe.skip;

integration('employee accounts on an isolated PostgreSQL database', () => {
  let database: typeof import('@cio/db/drizzle');
  let queries: typeof import('@cio/db/queries/organization');
  let services: typeof import('@api/services/organization/employees');
  let auth: (typeof import('@cio/db/auth'))['auth'];
  let resolveSignIn: (typeof import('@api/utils/employee-sign-in'))['resolveEmployeeSignInRequest'];
  let mail: typeof import('@cio/email');
  const organizationId = randomUUID();
  const otherOrgId = randomUUID();
  const administratorId = randomUUID();
  let counter = 0;

  beforeAll(async () => {
    const pathname = new URL(testDatabaseUrl!).pathname;
    if (!pathname.endsWith('_test')) throw new Error('Employee integration tests require a database ending in _test');

    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.PGBOUNCER_DATABASE_URL = '';
    process.env.PUBLIC_IS_SELFHOSTED = 'true';
    process.env.DASHBOARD_ORIGIN = 'http://localhost:3082';
    database = await import('@cio/db/drizzle');
    const [connection] = await database.db.execute(database.sql`select current_database() as name`);
    if (connection.name !== decodeURIComponent(pathname.slice(1))) {
      throw new Error('Employee integration tests are connected to an unexpected database');
    }

    queries = await import('@cio/db/queries/organization');
    services = await import('@api/services/organization/employees');
    auth = (await import('@cio/db/auth')).auth;
    resolveSignIn = (await import('@api/utils/employee-sign-in')).resolveEmployeeSignInRequest;
    mail = await import('@cio/email');
    await database.db
      .insert(database.role)
      .values([
        { id: 1, type: 'ADMIN' },
        { id: 2, type: 'TUTOR' },
        { id: 3, type: 'STUDENT' }
      ])
      .onConflictDoNothing();
    await database.db.insert(database.organization).values([
      { id: organizationId, name: 'Employee integration', siteName: `employee-${organizationId}` },
      { id: otherOrgId, name: 'Other organization' }
    ]);
    await database.db.insert(database.user).values({
      id: administratorId,
      email: `${administratorId}@example.com`,
      name: 'Administrator',
      emailVerified: true
    });
    await database.db.insert(database.profile).values({
      id: administratorId,
      fullname: 'Administrator',
      username: administratorId,
      email: `${administratorId}@example.com`,
      isEmailVerified: true
    });
    await database.db.insert(database.organizationmember).values({
      organizationId,
      profileId: administratorId,
      email: `${administratorId}@example.com`,
      roleId: 1,
      verified: true
    });
  }, 30000);

  beforeEach(() => {
    vi.mocked(mail.deliverEmail).mockClear();
    vi.mocked(mail.deliverEmail).mockResolvedValue([{ success: true }] as never);
  });

  async function draft(overrides: Partial<Parameters<typeof services.createEmployee>[2]> = {}) {
    counter++;
    const employeeCode = `MPTEST${counter}-${organizationId.slice(0, 6).toUpperCase()}`;
    const email = `${employeeCode.toLowerCase()}@example.com`;
    return services.createEmployee(organizationId, administratorId, {
      employeeCode,
      email,
      fullname: 'Test Employee',
      department: 'Operations',
      jobTitle: 'Specialist',
      managerId: null,
      startDate: '',
      role: 'EMPLOYEE',
      courseIds: [],
      cohortIds: [],
      sendActivation: false,
      ...overrides
    });
  }

  function activationToken() {
    const calls = vi.mocked(mail.deliverEmail).mock.calls;
    const content = calls[calls.length - 1][0][0].content;
    const match = content.match(/token=([a-f0-9]{64})/);
    if (!match) throw new Error('Missing activation token in test email');

    return match[1];
  }

  async function activateDraft(overrides: Partial<Parameters<typeof services.createEmployee>[2]> = {}) {
    const created = await draft({ ...overrides, sendActivation: true });
    const token = activationToken();
    await services.activateEmployee(token, 'Employee-password-2026');
    const identity = await queries.findEmployeeAccount(created.employee.email, organizationId);
    return { ...created.employee, profileId: identity.member!.profileId! };
  }

  it('creates a draft without credentials or an email, and prevents privilege escalation', async () => {
    const created = await draft();
    expect(created.employee.status).toBe('DRAFT');
    expect(mail.deliverEmail).not.toHaveBeenCalled();
    const identity = await queries.findEmployeeAccount(created.employee.email, organizationId);
    expect(identity.account).toBeNull();
    expect(identity.member?.status).toBe('DEACTIVATED');
    const hr = await activateDraft({ role: 'HR' });
    await expect(
      services.createEmployee(organizationId, hr.profileId, {
        employeeCode: 'ESCALATION',
        email: 'escalation@example.com',
        fullname: 'Escalation',
        role: 'ADMIN',
        department: '',
        jobTitle: '',
        managerId: null,
        startDate: '',
        courseIds: [],
        cohortIds: [],
        sendActivation: false
      })
    ).rejects.toThrow('employees.errors.forbidden');
  });

  it('rotates links, rejects expired and replayed tokens, and rolls back failed activation', async () => {
    const created = await draft({ sendActivation: true });
    const firstToken = activationToken();
    await services.sendEmployeeActivation(organizationId, administratorId, created.employee.id);
    const secondToken = activationToken();
    await expect(services.activateEmployee(firstToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    await expect(services.activateEmployee(secondToken)).rejects.toThrow('employees.errors.password');
    expect(await services.previewEmployeeActivation(secondToken)).toMatchObject({
      employeeCode: created.employee.employeeCode
    });
    await services.activateEmployee(secondToken, 'Employee-password-2026');
    await expect(services.activateEmployee(secondToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    const expired = await draft({ sendActivation: true });
    const expiredToken = activationToken();
    await database.db
      .update(database.employeeActivation)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(database.eq(database.employeeActivation.employeeId, expired.employee.id));
    await expect(services.activateEmployee(expiredToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    const departed = await draft({ sendActivation: true });
    const canceledToken = activationToken();
    await services.setEmployeeStatus(organizationId, administratorId, departed.employee.id, 'LEFT', 'Joining canceled');
    const restored = await services.setEmployeeStatus(
      organizationId,
      administratorId,
      departed.employee.id,
      'ACTIVE',
      'Joining resumed'
    );
    expect(restored.status).toBe('DRAFT');
    await expect(services.activateEmployee(canceledToken, 'Employee-password-2026')).rejects.toThrow(
      'employees.errors.activation'
    );
    await services.sendEmployeeActivation(organizationId, administratorId, departed.employee.id);
    await services.activateEmployee(activationToken(), 'Employee-password-2026');
  });

  it('allows exactly one concurrent activation and blocks ordinary self-registration', async () => {
    const created = await draft({ sendActivation: true });
    const token = activationToken();
    const signup = await auth.handler(
      new Request('http://localhost:3082/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost:3082' },
        body: JSON.stringify({ email: created.employee.email, password: 'Employee-password-2026', name: 'Bypass' })
      })
    );
    expect(signup.ok).toBe(false);
    const attempts = await Promise.allSettled([
      services.activateEmployee(token, 'Employee-password-2026'),
      services.activateEmployee(token, 'Employee-password-2026')
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
  });

  it('signs in using a normalized employee code and invalidates the session on suspension', async () => {
    const staff = await activateDraft();
    const request = new Request('http://localhost:3082/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://localhost:3082' },
      body: JSON.stringify({ email: staff.employeeCode.toLowerCase(), password: 'Employee-password-2026' })
    });
    const normalized = await resolveSignIn(request);
    const response = await auth.handler(normalized);
    expect(response.status).toBe(200);
    const cookie = response.headers.get('set-cookie')!.split(';')[0];
    const headers = new Headers({ cookie });
    expect(await auth.api.getSession({ headers })).not.toBeNull();
    await services.setEmployeeStatus(organizationId, administratorId, staff.id, 'SUSPENDED', 'Access review');
    expect(await auth.api.getSession({ headers })).toBeNull();
    expect(await queries.canEmployeeSignIn(staff.profileId)).toBe(false);
    const blocked = await resolveSignIn(request);
    const blockedResponse = await auth.handler(blocked);
    expect(blockedResponse.ok).toBe(false);
    await services.setEmployeeStatus(organizationId, administratorId, staff.id, 'ACTIVE', 'Review completed');
    expect(await queries.canEmployeeSignIn(staff.profileId)).toBe(true);
  });

  it('scopes managers to direct reports, refuses foreign assignments and rolls back duplicates', async () => {
    const manager = await activateDraft({ role: 'MANAGER' });
    const report = await draft({ managerId: manager.id });
    const outsider = await draft();
    const roster = await services.getEmployees(organizationId, manager.profileId, {
      search: '',
      department: '',
      page: 1,
      limit: 100
    });
    expect(roster.rows.map((staff) => staff.id)).toEqual([report.employee.id]);
    await expect(services.getEmployeeDetails(organizationId, manager.profileId, outsider.employee.id)).rejects.toThrow(
      'employees.errors.forbidden'
    );
    await expect(services.getEmployeeDetails(otherOrgId, administratorId, report.employee.id)).rejects.toThrow(
      'employees.errors.forbidden'
    );
    await expect(draft({ courseIds: [randomUUID()] })).rejects.toThrow('employees.errors.assignment');
    const duplicateEmail = `duplicate-${organizationId}@example.com`;
    await expect(draft({ employeeCode: outsider.employee.employeeCode, email: duplicateEmail })).rejects.toThrow();
    const orphan = await queries.findEmployeeAccount(duplicateEmail, organizationId);
    expect(orphan.member).toBeNull();
  });

  it('reports mail failure honestly and keeps invalid import rows separate', async () => {
    vi.mocked(mail.deliverEmail).mockResolvedValue([{ success: false }] as never);
    const created = await draft({ sendActivation: true });
    expect(created.delivery?.sent).toBe(false);
    expect((await queries.findEmployee(organizationId, created.employee.id))?.status).toBe('DRAFT');
    const rows = [
      { employeeCode: 'IMPORT01', fullname: 'Import Employee', email: `import-${organizationId}@example.com` },
      { employeeCode: 'BAD CODE', email: 'invalid' }
    ];
    const preview = await services.importEmployees(organizationId, administratorId, rows, true);
    expect(preview.rows.map((row) => row.success)).toEqual([true, false]);
    const imported = await services.importEmployees(organizationId, administratorId, rows, false);
    expect(imported.rows.map((row) => row.success)).toEqual([true, false]);
    const retry = await services.importEmployees(organizationId, administratorId, rows.slice(0, 1), false);
    expect(retry.rows[0].success).toBe(false);
  });

  it('rolls back credential creation and token consumption when enrollment fails, then reports ordinary course completion', async () => {
    const groupId = randomUUID();
    const courseId = randomUUID();
    await database.db.insert(database.group).values({ id: groupId, name: 'Employee course group', organizationId });
    await database.db
      .insert(database.course)
      .values({ id: courseId, title: 'Employee onboarding', description: 'Integration course', groupId });
    const created = await draft({ courseIds: [courseId], sendActivation: true });
    const token = activationToken();
    await database.db.execute(
      database.sql`CREATE FUNCTION employee_test_fail_group() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'enrollment test failure'; END; $$`
    );
    await database.db.execute(
      database.sql`CREATE TRIGGER employee_test_fail_group BEFORE INSERT ON groupmember FOR EACH ROW EXECUTE FUNCTION employee_test_fail_group()`
    );
    try {
      await expect(services.activateEmployee(token, 'Employee-password-2026')).rejects.toThrow();
      const identity = await queries.findEmployeeAccount(created.employee.email, organizationId);
      expect(identity.account).toBeNull();
      expect(identity.member?.profileId).toBeNull();
      expect(await services.previewEmployeeActivation(token)).toMatchObject({
        employeeCode: created.employee.employeeCode
      });
    } finally {
      await database.db.execute(database.sql`DROP TRIGGER employee_test_fail_group ON groupmember`);
      await database.db.execute(database.sql`DROP FUNCTION employee_test_fail_group()`);
    }
    await services.activateEmployee(token, 'Employee-password-2026');
    const assigned = await services.getEmployeeDetails(organizationId, administratorId, created.employee.id);
    expect(assigned.learning).toHaveLength(1);
    expect(assigned.learning[0].status).toBe('not_started');
    const completedAt = new Date().toISOString();
    await database.db
      .update(database.groupmember)
      .set({ completedAt })
      .where(database.eq(database.groupmember.groupId, groupId));
    const completed = await services.getEmployeeDetails(organizationId, administratorId, created.employee.id);
    expect(completed.learning[0].status).toBe('completed');
  });

  it('keeps an existing password on activation and follows membership demotion for administrative access', async () => {
    const email = `existing-${organizationId}@example.com`;
    const context = await auth.$context;
    const originalHash = await context.password.hash('Existing-password-2026');
    const profileId = await queries.createEmployeeCredentials(email, 'Existing account', originalHash);
    const created = await draft({ email, sendActivation: true });
    const token = activationToken();
    expect(await services.previewEmployeeActivation(token)).toMatchObject({ hasAccount: true });
    await services.activateEmployee(token);
    const [account] = await database.db
      .select()
      .from(database.account)
      .where(database.eq(database.account.userId, profileId));
    expect(account.password).toBe(originalHash);
    expect(await queries.getEmployeeAccess(organizationId, profileId)).toMatchObject({
      role: 'EMPLOYEE',
      canManage: false
    });
    const administrator = await activateDraft({ role: 'ADMIN' });
    const identity = await queries.findEmployeeAccount(administrator.email, organizationId);
    await queries.updateEmployeeMember(identity.member!.id, { roleId: 3 });
    expect(await queries.getEmployeeAccess(organizationId, administrator.profileId)).toMatchObject({
      role: 'EMPLOYEE',
      canManage: false
    });
    expect(created.employee.employeeCode).toBeTruthy();
  });

  afterAll(async () => {
    vi.restoreAllMocks();
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lockOrganization: vi.fn(),
  employeeAccess: vi.fn(),
  lockCourse: vi.fn(),
  library: vi.fn(),
  context: vi.fn(),
  insert: vi.fn(),
  assign: vi.fn(),
  email: vi.fn(),
  invalidate: vi.fn(),
  webhook: vi.fn(),
  capture: vi.fn()
}));
vi.mock('@cio/db/drizzle', () => ({ db: { transaction: mocks.transaction } }));
vi.mock('@cio/db/queries/course/library', () => ({
  getCourseLibrary: mocks.library,
  lockCourseForEnrollment: mocks.lockCourse
}));
vi.mock('@cio/db/queries/course/employees', () => ({
  getCourseEmployeeContext: mocks.context,
  insertCourseEmployees: mocks.insert,
  assignEmployeeCourseRecords: mocks.assign
}));
vi.mock('@cio/db/queries/organization', () => ({
  getEmployeeAccess: mocks.employeeAccess,
  lockEmployeeOrganization: mocks.lockOrganization
}));
vi.mock('@api/services/course/employees', () => ({ sendCourseAccessEmail: mocks.email }));
vi.mock('@cio/core/utils/redis/org-stats-cache', () => ({ invalidateOrgStats: mocks.invalidate }));
vi.mock('@cio/core/services/webhook/emit', () => ({
  emitCourseMemberAddedWebhookEvent: mocks.webhook,
  buildMemberSource: (method: string) => ({ method })
}));
vi.mock('@api/services/product-events', () => ({ captureLearnersEnrolled: mocks.capture }));

import { enrollInternalLearner, getCourseLibraryDetails, listCourseLibrary } from '@api/services/course/library';

describe('internal learner enrollment', () => {
  const user = { id: 'learner', email: 'Learner@example.com' };
  const transaction = { transaction: true };

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.transaction.mockImplementation((callback) => callback(transaction));
    mocks.employeeAccess.mockResolvedValue({ employeeId: 'employee' });
    mocks.lockCourse.mockResolvedValue({
      type: 'SELF_PACED',
      metadata: { showInLibrary: true, allowSelfEnrollment: true }
    });
    mocks.context.mockResolvedValue({ organizationId: 'org', groupId: 'group' });
    mocks.library.mockResolvedValue({ data: [{ hasAccess: false }], total: 1 });
    mocks.insert.mockResolvedValue([
      { id: 'member', groupId: 'group', profileId: 'learner', email: 'learner@example.com', roleId: 3 }
    ]);
  });

  it('writes membership and employee relation in the same transaction and marks the event source', async () => {
    const result = await enrollInternalLearner('org', 'course', user);
    expect(result.alreadyJoined).toBe(false);
    expect(mocks.insert).toHaveBeenCalledWith(
      [{ groupId: 'group', profileId: 'learner', email: 'learner@example.com', roleId: 3 }],
      transaction
    );
    expect(mocks.assign).toHaveBeenCalledWith(['employee'], 'course', transaction);
    expect(mocks.webhook).toHaveBeenCalledWith('course', expect.anything(), {
      source: { method: 'self_enroll' },
      actorProfileId: 'learner'
    });
    expect(mocks.email).toHaveBeenCalledOnce();
  });

  it('keeps program, cohort, and existing direct access without a new enrollment or notification', async () => {
    mocks.library.mockResolvedValue({ data: [{ hasAccess: true }] });
    const result = await enrollInternalLearner('org', 'course', user);
    expect(result.alreadyJoined).toBe(true);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.assign).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it('does not notify or change progress when another enrollment already exists', async () => {
    mocks.insert.mockResolvedValue([]);
    mocks.library
      .mockResolvedValueOnce({ data: [{ hasAccess: false }] })
      .mockResolvedValueOnce({ data: [{ hasAccess: true }] });
    expect((await enrollInternalLearner('org', 'course', user)).alreadyJoined).toBe(true);
    expect(mocks.email).not.toHaveBeenCalled();
  });

  it('does not report success for a conflicting legacy email without course access', async () => {
    mocks.insert.mockResolvedValue([]);
    await expect(enrollInternalLearner('org', 'course', user)).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.email).not.toHaveBeenCalled();
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it('supports active legacy members without employee profiles', async () => {
    mocks.employeeAccess.mockResolvedValue({ employeeId: null });
    expect((await enrollInternalLearner('org', 'course', user)).alreadyJoined).toBe(false);
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it('rejects inactive accounts before reading or writing a course', async () => {
    mocks.employeeAccess.mockResolvedValue(null);
    await expect(enrollInternalLearner('org', 'course', user)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.lockCourse).not.toHaveBeenCalled();
    await expect(listCourseLibrary('org', 'learner')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects a course from another organization', async () => {
    mocks.context.mockResolvedValue({ organizationId: 'other', groupId: 'group' });
    await expect(enrollInternalLearner('org', 'course', user)).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('keeps a hidden, draft or removed course undiscoverable', async () => {
    mocks.library.mockResolvedValue({ data: [], total: 0 });
    await expect(enrollInternalLearner('org', 'course', user)).rejects.toMatchObject({ statusCode: 404 });
    await expect(getCourseLibraryDetails('org', 'learner', 'course')).rejects.toMatchObject({ statusCode: 404 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it.each([
    { type: 'COMPLIANCE', metadata: { allowSelfEnrollment: true } },
    { type: 'SELF_PACED', metadata: { showInLibrary: true, allowSelfEnrollment: false } },
    { type: 'SELF_PACED', metadata: { showInLibrary: false, allowSelfEnrollment: true } }
  ])('rechecks current enrollment policy under the course lock: %j', async (course) => {
    mocks.lockCourse.mockResolvedValue(course);
    await expect(enrollInternalLearner('org', 'course', user)).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('keeps a committed enrollment successful if notification or cache updates fail', async () => {
    mocks.email.mockRejectedValue(new Error('mail unavailable'));
    mocks.invalidate.mockRejectedValue(new Error('cache unavailable'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await enrollInternalLearner('org', 'course', user)).alreadyJoined).toBe(false);
    expect(mocks.webhook).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledTimes(2);
    log.mockRestore();
  });
});

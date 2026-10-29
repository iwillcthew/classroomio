import { db } from '@cio/db/drizzle';
import type { TGroupmember } from '@cio/db/types';
import {
  assignEmployeeCourseRecords,
  findCourseEmployees,
  getCourseEmployeeContext,
  insertCourseEmployees
} from '@cio/db/queries/course/employees';
import { getCourseWithOrgData } from '@cio/db/queries/course';
import { getEmployeeAccess, lockEmployeeOrganization } from '@cio/db/queries/organization';
import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import { buildEmailBranding, buildEmailFromName } from '@cio/email';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import { emitCourseMemberAddedWebhookEvent, buildMemberSource } from '@cio/core/services/webhook/emit';
import { ROLE } from '@cio/utils/constants';
import type { TWebhookMemberSource } from '@cio/core/services/webhook/emit';
import type { TEventSource } from '@cio/core/services/posthog';
import { captureLearnersEnrolled } from '@api/services/product-events';
import type { TAddCourseMembers } from '@cio/utils/validation/course/people';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { enqueueTransactionalEmail } from '@api/services/jobs';
import { emitComplianceEnrollmentEvents, ensureComplianceEnrollmentRecordsForProfiles } from './compliance';

export async function listAvailableCourseEmployees(courseId: string, search?: string) {
  const context = await getCourseEmployeeContext(courseId);
  if (!context?.organizationId || !context.groupId) throw new AppError('Course not found', ErrorCodes.NOT_FOUND, 404);

  return findCourseEmployees(context.organizationId, { search, excludeGroupId: context.groupId });
}

export async function enrollExistingCourseEmployees(
  courseId: string,
  actorProfileId: string,
  members: TAddCourseMembers,
  sendEmail = true,
  webhookSource?: TWebhookMemberSource,
  eventSource: TEventSource = 'dashboard'
) {
  const context = await getCourseEmployeeContext(courseId);
  if (!context?.organizationId || !context.groupId) throw new AppError('Course not found', ErrorCodes.NOT_FOUND, 404);

  const organizationId = context.organizationId;
  const groupId = context.groupId;
  const isAllowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorProfileId);
  if (!isAllowed) throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 403);

  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(organizationId, transaction);
    const access = await getEmployeeAccess(organizationId, actorProfileId, transaction);
    if (!access) throw new AppError('Unauthorized', ErrorCodes.UNAUTHORIZED, 403);

    if (members.some((member) => member.roleId !== ROLE.STUDENT) && access.role !== 'ADMIN') {
      throw new AppError('Only administrators can assign instructors', ErrorCodes.UNAUTHORIZED, 403);
    }

    const profileIds = members.flatMap((member) => (member.profileId ? [member.profileId] : []));
    if (!profileIds.length || profileIds.length !== members.length || new Set(profileIds).size !== profileIds.length) {
      throw new AppError('Select existing employees from the Employees tab', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const employees = await findCourseEmployees(organizationId, { profileIds }, transaction);
    if (employees.length !== profileIds.length) {
      throw new AppError(
        'Only active employees in this organization can be assigned',
        ErrorCodes.VALIDATION_ERROR,
        400
      );
    }

    const employeeByProfile = new Map(employees.map((employee) => [employee.profileId, employee]));
    if (
      members.some(
        (member) =>
          member.roleId !== ROLE.STUDENT && !['ADMIN', 'TUTOR'].includes(employeeByProfile.get(member.profileId!)!.role)
      )
    ) {
      throw new AppError('Select an employee with an instructor role', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const values = members.map((member) => {
      const employee = employeeByProfile.get(member.profileId!)!;
      return { groupId, profileId: member.profileId!, roleId: member.roleId, email: employee.email };
    });
    const addedMembers = await insertCourseEmployees(values, transaction);
    const assignedEmployeeIds = addedMembers.flatMap((member) =>
      member.roleId === ROLE.STUDENT ? [employeeByProfile.get(member.profileId!)!.id] : []
    );
    await assignEmployeeCourseRecords(assignedEmployeeIds, courseId, transaction);

    const learnerIds = addedMembers.flatMap((member) =>
      member.roleId === ROLE.STUDENT && member.profileId ? [member.profileId] : []
    );
    const compliance = await ensureComplianceEnrollmentRecordsForProfiles([courseId], learnerIds, transaction);
    return { addedMembers, compliance };
  });

  await invalidateOrgStats(organizationId);
  captureLearnersEnrolled(result.addedMembers, 'admin', eventSource);
  await emitComplianceEnrollmentEvents(result.compliance.createdRecords);
  const course = sendEmail ? await getCourseWithOrgData(courseId) : null;
  for (const member of result.addedMembers) {
    const source = webhookSource ?? buildMemberSource('admin');
    await emitCourseMemberAddedWebhookEvent(courseId, member, { source, actorProfileId });
    if (course) await sendCourseAccessEmail(courseId, member, organizationId, course);
  }
  return result.addedMembers;
}

export async function sendCourseAccessEmail(
  courseId: string,
  member: TGroupmember,
  organizationId: string,
  courseInfo?: NonNullable<Awaited<ReturnType<typeof getCourseWithOrgData>>>
) {
  const course = courseInfo ?? (await getCourseWithOrgData(courseId));
  if (!course || !member.email) return;

  const branding = buildEmailBranding({ name: course.orgName, avatarUrl: course.orgAvatarUrl, theme: course.orgTheme });
  const baseUrl = getDashboardBaseUrl({
    siteName: course.orgSiteName,
    customDomain: course.orgCustomDomain,
    isCustomDomainVerified: course.orgIsCustomDomainVerified
  });
  const loginUrl = new URL(`/courses/${courseId}`, baseUrl).href;
  const from = buildEmailFromName(course.orgName || 'MP Learning');
  await enqueueTransactionalEmail('studentCourseWelcome', {
    to: member.email,
    from,
    fields: {
      orgName: course.orgName || 'MP Transformation',
      courseName: course.courseTitle || '',
      loginUrl,
      branding
    },
    idempotencyKey: `employee-course-access:${member.id}`,
    preference: { organizationId, recipientProfileId: member.profileId ?? undefined }
  });
}

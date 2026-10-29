import { db } from '@cio/db/drizzle';
import { getCourseLibrary, lockCourseForEnrollment } from '@cio/db/queries/course/library';
import {
  getCourseEmployeeContext,
  insertCourseEmployees,
  assignEmployeeCourseRecords
} from '@cio/db/queries/course/employees';
import { getEmployeeAccess, lockEmployeeOrganization } from '@cio/db/queries/organization';
import { canSelfEnrollInCourse } from '@cio/utils/functions';
import { ROLE } from '@cio/utils/constants';
import type { TGetRecommendedCourses } from '@cio/utils/validation/course';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import { emitCourseMemberAddedWebhookEvent, buildMemberSource } from '@cio/core/services/webhook/emit';
import { captureLearnersEnrolled } from '@api/services/product-events';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { sendCourseAccessEmail } from './employees';

async function assertLibraryMember(organizationId: string, profileId: string) {
  const access = await getEmployeeAccess(organizationId, profileId);
  if (!access) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
}

export async function listCourseLibrary(
  organizationId: string,
  profileId: string,
  query: TGetRecommendedCourses = {},
  recommended = false
) {
  await assertLibraryMember(organizationId, profileId);
  const options = { ...query, recommended };
  return getCourseLibrary(organizationId, profileId, options);
}

export async function getCourseLibraryDetails(organizationId: string, profileId: string, courseId: string) {
  await assertLibraryMember(organizationId, profileId);
  const result = await getCourseLibrary(organizationId, profileId, { courseId });
  const course = result.data[0];
  if (!course) throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);

  return course;
}

export async function enrollInternalLearner(
  organizationId: string,
  courseId: string,
  user: { id: string; email: string }
) {
  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(organizationId, transaction);
    const access = await getEmployeeAccess(organizationId, user.id, transaction);
    if (!access) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);

    const course = await lockCourseForEnrollment(courseId, transaction);
    const context = await getCourseEmployeeContext(courseId, transaction);
    if (!course || context?.organizationId !== organizationId || !context.groupId) {
      throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);
    }

    const library = await getCourseLibrary(organizationId, user.id, { courseId }, transaction);
    const details = library.data[0];
    if (!details) throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);

    if (details.hasAccess) return null;

    if (!canSelfEnrollInCourse(course)) {
      throw new AppError('This course is assigned by the training team', ErrorCodes.FORBIDDEN, 403);
    }

    const email = user.email.trim().toLowerCase();
    const members = [{ groupId: context.groupId, profileId: user.id, email, roleId: ROLE.STUDENT }];
    const inserted = await insertCourseEmployees(members, transaction);
    const member = inserted[0];
    if (!member) {
      const refreshed = await getCourseLibrary(organizationId, user.id, { courseId }, transaction);
      if (refreshed.data[0]?.hasAccess) return null;

      throw new AppError(
        'An existing course member needs to be reconciled by the training team',
        ErrorCodes.CONFLICT,
        409
      );
    }

    if (access.employeeId) {
      await assignEmployeeCourseRecords([access.employeeId], courseId, transaction);
    }

    return member;
  });

  if (result) {
    const source = buildMemberSource('self_enroll');
    captureLearnersEnrolled([result], 'self');
    const effects = await Promise.allSettled([
      invalidateOrgStats(organizationId),
      emitCourseMemberAddedWebhookEvent(courseId, result, { source, actorProfileId: user.id }),
      sendCourseAccessEmail(courseId, result, organizationId)
    ]);
    for (const effect of effects) {
      if (effect.status === 'rejected') console.error('Course enrollment follow-up failed', effect.reason);
    }
  }

  return { alreadyJoined: !result, redirectTo: `/courses/${courseId}/lessons?next=true` };
}

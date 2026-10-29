import { db } from '@cio/db/drizzle';
import { getCourseEmployeeContext, findCourseEmployees } from '@cio/db/queries/course/employees';
import { lockCourseForEnrollment } from '@cio/db/queries/course/library';
import { getEmployeeAccess, lockEmployeeOrganization } from '@cio/db/queries/organization';
import { isCourseTeamMemberOrOrgAdmin } from '@cio/db/queries/group';
import {
  createEnrollmentSource,
  createTrainingAssignment,
  ensureLearnerMembership,
  getLearningContexts,
  revokeEnrollmentSource
} from '@cio/db/queries/course/learning-access';
import { invalidateOrgStats } from '@cio/core/utils/redis/org-stats-cache';
import { AppError, ErrorCodes } from '@api/utils/errors';
import type { TAssignCourseTraining } from '@cio/utils/validation/course/training-assignment';
import { sendCourseAccessEmail } from './employees';
import { ensureComplianceEnrollmentRecordsForProfiles, emitComplianceEnrollmentEvents } from './compliance';
import { buildMemberSource, emitCourseMemberAddedWebhookEvent } from '@cio/core/services/webhook/emit';
import { captureLearnersEnrolled } from '@api/services/product-events';

async function requireTrainingManager(courseId: string, actorId: string) {
  const context = await getCourseEmployeeContext(courseId);
  const allowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorId);
  if (!context?.organizationId || !context.groupId || !allowed) {
    throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
  }

  return context as typeof context & { organizationId: string; groupId: string };
}

export async function assignCourseTraining(courseId: string, actorId: string, input: TAssignCourseTraining) {
  const context = await requireTrainingManager(courseId, actorId);
  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(context.organizationId, transaction);
    const actor = await getEmployeeAccess(context.organizationId, actorId, transaction);
    const course = await lockCourseForEnrollment(courseId, transaction);
    const allowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorId, transaction);
    if (!actor || !allowed || !course || course.status !== 'ACTIVE' || course.isTemplate) {
      throw new AppError('Course unavailable', ErrorCodes.FORBIDDEN, 403);
    }

    if (course.type === 'COMPLIANCE' && input.dueDate) {
      throw new AppError(
        'Use compliance deadline controls for this course',
        ErrorCodes.VALIDATION_ERROR,
        400,
        'dueDate'
      );
    }

    const employees = await findCourseEmployees(context.organizationId, { profileIds: input.profileIds }, transaction);
    if (employees.length !== input.profileIds.length) {
      throw new AppError('Only active employees can be assigned', ErrorCodes.VALIDATION_ERROR, 400);
    }

    const created = [];
    for (const employee of employees) {
      const member = await ensureLearnerMembership(context.groupId, employee.profileId!, employee.email, transaction);
      if (!member) throw new AppError('Course member conflict', ErrorCodes.CONFLICT, 409);

      const enrollment = await createEnrollmentSource(courseId, employee.profileId!, 'DIRECT', transaction);
      if (!enrollment.created) continue;

      const fields = {
        assignedBy: actorId,
        required: course.type === 'COMPLIANCE' || input.required,
        dueDate: input.dueDate,
        message: input.message
      };
      const assignment = await createTrainingAssignment(enrollment.source.id, fields, transaction);
      created.push({ member, assignment });
    }

    const profileIds = created.map((item) => item.member.profileId!);
    const compliance = await ensureComplianceEnrollmentRecordsForProfiles([courseId], profileIds, transaction);
    return { created, compliance };
  });
  const effects: Promise<unknown>[] = [
    invalidateOrgStats(context.organizationId),
    emitComplianceEnrollmentEvents(result.compliance.createdRecords)
  ];
  const source = buildMemberSource('admin');
  captureLearnersEnrolled(
    result.created.map((item) => item.member),
    'admin'
  );
  effects.push(
    ...result.created.map((item) =>
      emitCourseMemberAddedWebhookEvent(courseId, item.member, { source, actorProfileId: actorId })
    )
  );
  if (input.sendEmail) {
    effects.push(
      ...result.created.map((item) => {
        const notification = { idempotencyKey: `training-assignment:${item.assignment!.id}`, message: input.message };
        return sendCourseAccessEmail(courseId, item.member, context.organizationId, undefined, notification);
      })
    );
  }
  const outcomes = await Promise.allSettled(effects);
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') console.error('Training assignment follow-up failed', outcome.reason);
  }

  return { assigned: result.created.length, existing: input.profileIds.length - result.created.length };
}

export async function cancelCourseSource(courseId: string, sourceId: string, actorId: string) {
  const context = await requireTrainingManager(courseId, actorId);
  const result = await db.transaction(async (transaction) => {
    await lockEmployeeOrganization(context.organizationId, transaction);
    const actor = await getEmployeeAccess(context.organizationId, actorId, transaction);
    if (!actor) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);

    const course = await lockCourseForEnrollment(courseId, transaction);
    const allowed = await isCourseTeamMemberOrOrgAdmin(courseId, actorId, transaction);
    if (!allowed) throw new AppError('Unauthorized', ErrorCodes.FORBIDDEN, 403);
    if (course?.type === 'COMPLIANCE') throw new AppError('Use compliance waiver controls', ErrorCodes.CONFLICT, 409);

    return revokeEnrollmentSource(courseId, sourceId, actorId, transaction);
  });
  await invalidateOrgStats(context.organizationId);
  return { revoked: Boolean(result) };
}

export async function listCourseLearningSources(courseId: string, actorId: string) {
  const context = await requireTrainingManager(courseId, actorId);
  return getLearningContexts(context.organizationId, { courseIds: [courseId] });
}

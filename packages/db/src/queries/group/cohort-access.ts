import { and, asc, eq } from 'drizzle-orm';
import { db } from '@db/drizzle';
import * as schema from '@db/schema';

export async function getCourseCohortAccess(courseId: string, profileId: string) {
  const [access] = await db
    .select({
      courseId: schema.course.id,
      courseGroupId: schema.group.id,
      organizationId: schema.group.organizationId,
      profileEmail: schema.profile.email,
      roleId: schema.cohortMember.roleId
    })
    .from(schema.course)
    .innerJoin(schema.group, eq(schema.group.id, schema.course.groupId))
    .innerJoin(schema.cohortCourse, eq(schema.cohortCourse.courseId, schema.course.id))
    .innerJoin(
      schema.cohort,
      and(
        eq(schema.cohort.id, schema.cohortCourse.cohortId),
        eq(schema.cohort.status, 'ACTIVE'),
        eq(schema.cohort.organizationId, schema.group.organizationId)
      )
    )
    .innerJoin(
      schema.cohortMember,
      and(eq(schema.cohortMember.cohortId, schema.cohort.id), eq(schema.cohortMember.profileId, profileId))
    )
    .leftJoin(schema.profile, eq(schema.profile.id, schema.cohortMember.profileId))
    .where(eq(schema.course.id, courseId))
    .orderBy(asc(schema.cohortMember.roleId))
    .limit(1);
  return access ?? null;
}

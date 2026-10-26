import type {
  TPublicApiCreateLesson,
  TPublicApiCourseParam,
  TPublicApiLessonParam,
  TPublicApiUpdateLesson
} from '@cio/utils/validation/public-api';

import { createLesson, updateLessonService, type LessonWriteOptions } from '@cio/core/services/lesson/lesson';
import { createAssetUsage, deleteAssetUsagesByTargetSlots } from '@cio/db/queries/assets';
import type { DbOrTxClient } from '@cio/db/drizzle';
import { getLessonById } from '@cio/db/queries/lesson';
import { getCourseOrganizationId } from '@cio/db/queries/tag';
import { assertAutomationActor } from '@api/services/v1/shared';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { resolveLessonVideos, type ResolvedLessonVideo } from './videos';

async function assertCourseBelongsToOrganization(orgId: string, courseId: string): Promise<void> {
  const courseOrganizationId = await getCourseOrganizationId(courseId);
  if (!courseOrganizationId || courseOrganizationId !== orgId) {
    throw new AppError('Course not found', ErrorCodes.COURSE_NOT_FOUND, 404);
  }
}

/** A lesson id is caller-supplied, so it is checked against the course rather than trusted. */
async function assertLessonBelongsToCourse(courseId: string, lessonId: string): Promise<void> {
  const lesson = await getLessonById(lessonId);
  if (!lesson || lesson.courseId !== courseId) {
    throw new AppError('Lesson not found', ErrorCodes.LESSON_NOT_FOUND, 404);
  }
}

const LESSON_VIDEO_SLOT = 'lesson_video';

async function recordLessonVideoUsage(
  orgId: string,
  actorId: string,
  lessonId: string,
  videos: ResolvedLessonVideo[],
  client: DbOrTxClient
): Promise<void> {
  await deleteAssetUsagesByTargetSlots('lesson', lessonId, [LESSON_VIDEO_SLOT], client);

  for (const [position, video] of videos.entries()) {
    if (!video.assetId) continue;

    await createAssetUsage(
      {
        organizationId: orgId,
        assetId: video.assetId,
        targetType: 'lesson',
        targetId: lessonId,
        slotType: LESSON_VIDEO_SLOT,
        slotKey: null,
        position,
        createdByProfileId: actorId
      },
      client
    );
  }
}

function lessonWriteOptions(
  orgId: string,
  actorId: string,
  videos: ResolvedLessonVideo[] | undefined
): LessonWriteOptions {
  if (!videos) return { actorProfileId: actorId };

  const persistRelated: LessonWriteOptions['persistRelated'] = (lesson, client) =>
    recordLessonVideoUsage(orgId, actorId, lesson.id, videos, client);

  return { actorProfileId: actorId, persistRelated };
}

export async function createPublicApiLessonService(
  orgId: string,
  actorId: string | null,
  params: TPublicApiCourseParam,
  payload: TPublicApiCreateLesson
) {
  assertAutomationActor(actorId);
  await assertCourseBelongsToOrganization(orgId, params.courseId);

  const videos = payload.videos?.length ? await resolveLessonVideos(orgId, actorId, payload.videos) : undefined;

  const writeOptions = lessonWriteOptions(orgId, actorId, videos);
  const lesson = await createLesson(
    params.courseId,
    {
      title: payload.title,
      courseId: params.courseId,
      order: payload.order,
      sectionId: payload.sectionId,
      isUnlocked: payload.isUnlocked,
      public: payload.public,
      ...(videos ? { videos } : {})
    },
    writeOptions
  );

  return lesson;
}

export async function updatePublicApiLessonService(
  orgId: string,
  actorId: string | null,
  params: TPublicApiLessonParam,
  payload: TPublicApiUpdateLesson
) {
  assertAutomationActor(actorId);
  await assertCourseBelongsToOrganization(orgId, params.courseId);
  await assertLessonBelongsToCourse(params.courseId, params.lessonId);

  const videos = payload.videos ? await resolveLessonVideos(orgId, actorId, payload.videos) : undefined;

  const writeOptions = lessonWriteOptions(orgId, actorId, videos);
  const lesson = await updateLessonService(
    params.lessonId,
    {
      title: payload.title,
      order: payload.order,
      isUnlocked: payload.isUnlocked,
      public: payload.public,
      ...(videos ? { videos } : {})
    },
    writeOptions
  );

  return lesson;
}

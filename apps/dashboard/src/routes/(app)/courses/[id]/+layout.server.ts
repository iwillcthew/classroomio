import type { GetCourseSuccess } from '$features/course/utils/types';
import { classroomio, getApiHeaders } from '$lib/utils/services/api';
import { safeServerApi } from '$lib/utils/services/api/server';
import { error, redirect } from '@sveltejs/kit';
import type { LibraryDetailSuccess } from '$features/lms/utils/types';

export const load = async ({ params, cookies, parent }) => {
  const courseId = params.id || '';
  if (!courseId) {
    throw error(404, 'Course not found');
  }

  const result = await safeServerApi<GetCourseSuccess>(() =>
    classroomio.course[':courseId'].$get(
      {
        param: { courseId },
        query: {}
      },
      getApiHeaders(cookies)
    )
  );

  if (!result.ok) {
    if (result.status === 403) {
      const { org } = await parent();
      if (org) {
        const overview = await safeServerApi<LibraryDetailSuccess>(() =>
          classroomio.organization.courses.library[':courseId'].$get(
            { param: { courseId } },
            getApiHeaders(cookies, org.id)
          )
        );
        if (overview.ok) redirect(303, `/lms/explore/${courseId}`);

        if (overview.status >= 500 || overview.status === 0) error(503, overview.message);
      }
    }
    if (result.status === 403 || result.status === 404) error(404, 'Course not found');

    throw error(500, result.message);
  }

  return {
    courseId,
    course: result.body.data
  };
};

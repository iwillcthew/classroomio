import { error } from '@sveltejs/kit';
import { classroomio, getApiHeaders } from '$lib/utils/services/api';
import { safeServerApi } from '$lib/utils/services/api/server';
import type { LibraryDetailSuccess } from '$features/lms/utils/types';

export const load = async ({ params, parent, cookies }) => {
  const { org } = await parent();
  if (!org) error(503, 'MP Learning is not initialized');

  const result = await safeServerApi<LibraryDetailSuccess>(() =>
    classroomio.organization.courses.library[':courseId'].$get(
      { param: { courseId: params.courseId } },
      getApiHeaders(cookies, org.id)
    )
  );
  if (!result.ok) {
    if ([400, 403, 404].includes(result.status)) error(404, 'Course not found');

    error(503, 'Training library is temporarily unavailable');
  }

  return { course: result.body.data, breadcrumb: result.body.data.title };
};

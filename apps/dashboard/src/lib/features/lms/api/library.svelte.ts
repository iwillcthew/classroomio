import { goto } from '$app/navigation';
import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';
import { snackbar } from '$features/ui/snackbar/store';
import type {
  LibraryCourse,
  LibraryPagination,
  LibraryQuery,
  LibraryRequest,
  LibraryEnrollRequest
} from '../utils/types';

export class LibraryApi extends BaseApiWithErrors {
  courses = $state<LibraryCourse[] | null>(null);
  pagination = $state<LibraryPagination | null>(null);
  isLibraryLoading = $state(true);
  loadFailed = $state(false);
  isEnrolling = $state(false);
  enrollmentFailed = $state(false);
  #controller: AbortController | null = null;

  async loadLibrary(query: LibraryQuery) {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.isLibraryLoading = true;
    this.loadFailed = false;
    const requestQuery = {
      limit: String(query.limit ?? 12),
      page: String(query.page ?? 1),
      search: query.search,
      sort: query.sort
    };
    const result = await this.execute<LibraryRequest>({
      requestFn: () =>
        classroomio.organization.courses.library.$get({ query: requestQuery }, { init: { signal: controller.signal } }),
      logContext: 'fetching training library',
      onSuccess: (response) => {
        if (controller.signal.aborted) return;

        this.courses = response.data;
        this.pagination = response.pagination;
      }
    });
    if (controller.signal.aborted) return;

    this.loadFailed = !result;
    this.isLibraryLoading = false;
  }

  async enroll(course: LibraryCourse) {
    if (this.isEnrolling) return;

    this.isEnrolling = true;
    this.enrollmentFailed = false;
    try {
      const result = await this.execute<LibraryEnrollRequest>({
        requestFn: () => classroomio.course[':courseId'].enroll.$post({ param: { courseId: course.id }, json: {} }),
        logContext: 'enrolling in internal training',
        onSuccess: () => snackbar.success('training_library.enrolled_success'),
        onError: () => {
          this.enrollmentFailed = true;
        }
      });
      if (!result) {
        this.enrollmentFailed = true;
        return;
      }

      course.hasAccess = true;
      course.isEnrolled = true;
      course.canSelfEnroll = false;
      await goto(result.data.redirectTo);
    } finally {
      this.isEnrolling = false;
    }
  }

  cancel() {
    this.#controller?.abort();
  }
}

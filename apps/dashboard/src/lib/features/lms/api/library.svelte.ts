import { CoursesApi } from '$features/course/api/courses.svelte';
import type { LibraryQuery } from '../utils/types';

export class LibraryApi extends CoursesApi {
  isLibraryLoading = $state(true);
  loadFailed = $state(false);
  #controller: AbortController | null = null;

  async loadLibrary(query: LibraryQuery) {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.isLibraryLoading = true;
    this.loadFailed = false;
    const result = await this.getRecommendedCourses(query, controller.signal);
    if (controller.signal.aborted) return;

    this.loadFailed = !result;
    this.isLibraryLoading = false;
  }

  cancel() {
    this.#controller?.abort();
  }
}

import { CoursesApi } from '$features/course/api/courses.svelte';

export class LearningWorkspaceApi extends CoursesApi {
  isWorkspaceLoading = $state(true);
  loadFailed = $state(false);

  async loadWorkspace() {
    this.isWorkspaceLoading = true;
    this.loadFailed = false;
    const results = await Promise.allSettled([this.getEnrolledCourses(), this.getRecommendedCourses({ limit: 3 })]);
    this.loadFailed = results[0].status === 'rejected' || !results[0].value;
    this.isWorkspaceLoading = false;
  }
}

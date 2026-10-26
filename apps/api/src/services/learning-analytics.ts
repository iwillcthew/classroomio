import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash';
import type { TWorkforceMemberFilters } from '@cio/utils/validation/organization';

export async function getLearningAnalytics(orgId: string, days: 7 | 30 | 90, filters: TWorkforceMemberFilters = {}) {
  const filtered = !!(filters.unitId || filters.jobTitleId || filters.search);
  const snapshotRequest = filtered
    ? getLearningAnalyticsSnapshot(orgId, undefined, filters)
    : getLearningAnalyticsSnapshot(orgId);
  const activityRequest = filtered
    ? getLearningAnalyticsActivity(orgId, days, undefined, filters)
    : getLearningAnalyticsActivity(orgId, days);
  const [snapshot, activity] = await Promise.all([snapshotRequest, activityRequest]);
  const completionRate =
    snapshot.assignments > 0 ? Math.round((snapshot.completed / snapshot.assignments) * 100) : null;
  const unassignedEmployees = snapshot.employees - snapshot.enrolledEmployees;
  const generatedAt = new Date().toISOString();

  return { snapshot, activity, completionRate, unassignedEmployees, generatedAt, days };
}

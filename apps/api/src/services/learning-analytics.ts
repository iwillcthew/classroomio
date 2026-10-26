import { getLearningAnalyticsActivity, getLearningAnalyticsSnapshot } from '@cio/db/queries/dash';

export async function getLearningAnalytics(orgId: string, days: 7 | 30 | 90) {
  const [snapshot, activity] = await Promise.all([
    getLearningAnalyticsSnapshot(orgId),
    getLearningAnalyticsActivity(orgId, days)
  ]);
  const completionRate =
    snapshot.assignments > 0 ? Math.round((snapshot.completed / snapshot.assignments) * 100) : null;
  const unassignedEmployees = snapshot.employees - snapshot.enrolledEmployees;
  const generatedAt = new Date().toISOString();

  return { snapshot, activity, completionRate, unassignedEmployees, generatedAt, days };
}

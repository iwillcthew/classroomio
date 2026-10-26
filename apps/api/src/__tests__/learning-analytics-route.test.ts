import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from '@api/utils/hono';
import { learningAnalyticsRouter } from '@api/routes/dash/learning-analytics';
import { getLearningAnalytics } from '@api/services/learning-analytics';

vi.mock('@api/services/learning-analytics', () => ({ getLearningAnalytics: vi.fn() }));

const organizationId = '00000000-0000-4000-8000-000000000001';

function makeApp(role: number | null) {
  return new Hono()
    .use('*', async (context, next) => {
      context.set('user', role === null ? null : ({ id: 'test-user' } as never));
      context.set('session', role === null ? null : ({ id: 'test-session' } as never));
      const roles: Record<string, number> = role === null ? {} : { [organizationId]: role };
      context.set('orgRoles', roles);
      await next();
    })
    .route('/', learningAnalyticsRouter);
}

describe('internal training analytics authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([1, 2])('allows staff role %s and returns one report shape', async (role) => {
    vi.mocked(getLearningAnalytics).mockResolvedValue({ days: 7 } as never);
    const response = await makeApp(role).request('/learning-analytics?days=7', {
      headers: { 'cio-org-id': organizationId }
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(getLearningAnalytics).toHaveBeenCalledWith(organizationId, 7);
  });

  it.each([null, 3])('rejects non-staff role %s before accessing data', async (role) => {
    const response = await makeApp(role).request('/learning-analytics', { headers: { 'cio-org-id': organizationId } });
    expect(response.status).toBe(role === null ? 401 : 403);
    expect(getLearningAnalytics).not.toHaveBeenCalled();
  });

  it('rejects a foreign organization and unsupported date windows', async () => {
    const app = makeApp(1);
    const foreign = await app.request('/learning-analytics', { headers: { 'cio-org-id': 'other-org' } });
    expect(foreign.status).toBe(403);
    const invalid = await app.request('/learning-analytics?days=8', { headers: { 'cio-org-id': organizationId } });
    expect(invalid.status).toBe(400);
    expect(getLearningAnalytics).not.toHaveBeenCalled();
  });
});

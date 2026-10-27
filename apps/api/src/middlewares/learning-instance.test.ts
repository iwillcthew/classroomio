import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from '@api/utils/hono';

vi.mock('@cio/db/queries/organization', () => ({ getFirstOrganization: vi.fn() }));
import { getFirstOrganization } from '@cio/db/queries/organization';
import { learningInstance } from './learning-instance';

describe('MP Learning organization scope', () => {
  const app = new Hono()
    .use('*', async (context, next) => {
      context.set('orgRoles', { mp: 1, legacy: 1 });
      await next();
    })
    .use('*', learningInstance)
    .get('*', (context) => context.json(context.get('orgRoles')));

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getFirstOrganization).mockResolvedValue({ id: 'mp' } as never);
  });

  it('accepts the fixed instance and excludes legacy memberships', async () => {
    const response = await app.request('/account', { headers: { 'cio-org-id': 'mp' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ mp: 1 });
  });

  it('rejects another organization even when the session has admin membership there', async () => {
    const response = await app.request('/organization/team', { headers: { 'cio-org-id': 'legacy' } });
    expect(response.status).toBe(404);
  });

  it('scopes roles even when the request has no organization header', async () => {
    const response = await app.request('/course/course-id');
    expect(await response.json()).toEqual({ mp: 1 });
  });

  it('does not accept a supplied organization before initialization', async () => {
    vi.mocked(getFirstOrganization).mockResolvedValue(null);
    const response = await app.request('/organization/team', { headers: { 'cio-org-id': 'mp' } });
    expect(response.status).toBe(404);
  });

  it('keeps unauthenticated bootstrap and health requests available without a database read', async () => {
    const publicApp = new Hono().use('*', learningInstance).get('/', (context) => context.text('ok'));
    const response = await publicApp.request('/');
    expect(response.status).toBe(200);
    expect(getFirstOrganization).not.toHaveBeenCalled();
  });
});

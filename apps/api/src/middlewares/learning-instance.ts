import type { MiddlewareHandler } from 'hono';
import type { AuthSession } from '@api/types/auth';
import { getFirstOrganization } from '@cio/db/queries/organization';

export const learningInstance: MiddlewareHandler<AuthSession> = async (context, next) => {
  const requestedOrgId = context.req.header('cio-org-id');
  const orgRoles = context.get('orgRoles') ?? {};
  if (!requestedOrgId && !Object.keys(orgRoles).length) return next();

  const organization = await getFirstOrganization();
  if (requestedOrgId && requestedOrgId !== organization?.id) {
    return context.json({ success: false, error: 'Organization not found', code: 'ORGANIZATION_NOT_FOUND' }, 404);
  }

  const role = organization ? orgRoles[organization.id] : undefined;
  const instanceRoles = organization && role !== undefined ? { [organization.id]: role } : {};
  context.set('orgRoles', instanceRoles);

  await next();
};

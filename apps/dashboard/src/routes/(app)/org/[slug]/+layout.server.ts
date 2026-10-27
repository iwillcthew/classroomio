import { error, redirect } from '@sveltejs/kit';

export const load = async ({ params, parent }) => {
  const { org } = await parent();
  if (!org) error(503, 'MP Learning is not initialized');

  if (params.slug === '*') redirect(307, `/org/${org.siteName}/dash`);

  if (params.slug !== org.siteName) error(404, 'Not found');

  return { orgName: org.siteName, orgId: org.id };
};

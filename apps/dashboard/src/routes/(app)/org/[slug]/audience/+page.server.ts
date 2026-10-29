import { redirect } from '@sveltejs/kit';

export const load = ({ params, url }) => {
  redirect(308, `/org/${encodeURIComponent(params.slug)}/employees` + url.search);
};

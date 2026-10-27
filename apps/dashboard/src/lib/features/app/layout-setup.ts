import { getFirstOrg } from '$features/org/api/org.server';
import type { AccountOrg, PublicOrg } from '$features/app/types';
import { toPublicOrg } from '$features/app/public-org';
import type { Cookies } from '@sveltejs/kit';
import { getApiKeyHeaders } from '$lib/utils/services/api/server';

export interface OrgSiteInfo {
  isOrgSite: boolean;
  org: PublicOrg | null;
  subdomain: string;
  orgSiteName: string;
}

export async function getOrgSiteInfo(cookies: Cookies): Promise<OrgSiteInfo> {
  cookies.delete('_orgSiteName', { path: '/' });
  const apiKeyHeaders = getApiKeyHeaders();
  const organization = await getFirstOrg(apiKeyHeaders);
  const org = organization ? toPublicOrg(organization as AccountOrg) : null;
  const orgSiteName = organization?.siteName ?? '';

  return { isOrgSite: !!org, org, subdomain: '', orgSiteName };
}

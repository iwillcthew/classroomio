import { MP_LEARNING } from '@cio/utils/constants';
import type { AccountOrg, PublicOrg } from './types';

type OrganizationCustomization = AccountOrg['customization'] & {
  auth?: {
    backgroundImage?: string;
  };
};

/**
 * Keep the organization data serialized into public page loads intentionally small.
 * Account-only configuration, billing identifiers, and internal timestamps must not
 * cross the server-to-browser boundary for an organization site.
 */
export function toPublicOrg(org: AccountOrg): PublicOrg {
  const customization = org.customization as OrganizationCustomization;
  const signupSettings = org.settings?.signup;
  const languageSettings = org.settings?.language;
  const authBackgroundImage = customization.auth?.backgroundImage;

  return {
    id: org.id,
    name: MP_LEARNING.name,
    siteName: org.siteName,
    avatarUrl: MP_LEARNING.logo,
    favicon: '/brand/mp-mark.png',
    theme: MP_LEARNING.theme,
    isRestricted: org.isRestricted,
    landingpage: org.landingpage,
    customDomain: null,
    isCustomDomainVerified: false,
    disableSignup: org.disableSignup,
    disableSignupMessage: org.disableSignupMessage,
    disableEmailPassword: org.disableEmailPassword,
    disableGoogleAuth: org.disableGoogleAuth,
    settings: {
      ...(signupSettings ? { signup: { inviteOnly: signupSettings.inviteOnly } } : {}),
      ...(languageSettings ? { language: languageSettings } : {})
    },
    customization: authBackgroundImage
      ? {
          auth: {
            backgroundImage: authBackgroundImage
          }
        }
      : {},
    plans: org.plans.map((plan) => ({
      planName: plan.planName,
      isActive: plan.isActive
    }))
  };
}

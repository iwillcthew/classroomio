import { AppError, ErrorCodes } from '@api/utils/errors';
import { db } from '@cio/db/drizzle';
import {
  createOrganization,
  createOrganizationMember,
  createOrganizationPlan,
  getFirstOrganization,
  lockLearningInstance
} from '@cio/db/queries/organization';
import { MP_LEARNING, ROLE } from '@cio/utils/constants';

export async function ensureLearningInstance(profileId: string, email: string) {
  const existingOrganization = await getFirstOrganization();
  if (existingOrganization) return existingOrganization;

  const approvedEmails = (process.env.LMS_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((approvedEmail) => approvedEmail.trim().toLowerCase())
    .filter(Boolean);

  if (!approvedEmails.includes(email.trim().toLowerCase())) {
    throw new AppError(
      'Only an approved administrator can initialize MP Learning',
      ErrorCodes.ORG_TEAM_NOT_AUTHORIZED,
      403
    );
  }

  return db.transaction(async (transaction) => {
    await lockLearningInstance(transaction);
    const organization = await getFirstOrganization(transaction);
    if (organization) return organization;

    const createdOrganization = await createOrganization(
      {
        name: MP_LEARNING.name,
        siteName: MP_LEARNING.siteName,
        theme: MP_LEARNING.theme,
        settings: { language: { locale: MP_LEARNING.locale, enforced: false } }
      },
      transaction
    );
    const member = await createOrganizationMember(
      {
        organizationId: createdOrganization.id,
        profileId,
        roleId: ROLE.ADMIN,
        verified: true
      },
      transaction
    );
    const subscriptionId = `selfhosted-${createdOrganization.id}`;

    await createOrganizationPlan(
      {
        orgId: createdOrganization.id,
        planName: 'ENTERPRISE',
        subscriptionId,
        triggeredBy: member.id,
        payload: {},
        isActive: true,
        provider: 'selfhosted'
      },
      transaction
    );

    return createdOrganization;
  });
}

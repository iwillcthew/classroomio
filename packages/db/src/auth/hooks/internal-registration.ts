import { APIError } from 'better-auth/api';
import { getEmployeeByIdentity } from '@db/queries/organization/employees';
import {
  checkEmailExistsInOrg,
  getFirstOrganization,
  hasActiveOrganizationInviteForEmail
} from '@db/queries/organization';

export async function enforceInternalRegistration(user: { email: string }) {
  const email = user.email.trim().toLowerCase();
  const managedEmployee = await getEmployeeByIdentity(email);
  if (managedEmployee) {
    throw new APIError('FORBIDDEN', { message: 'Vui lòng sử dụng thư kích hoạt tài khoản do HR gửi.' });
  }

  const approvedEmails = (process.env.LMS_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (approvedEmails.includes(email)) return;

  const organization = await getFirstOrganization();
  if (organization) {
    const hasMembership = await checkEmailExistsInOrg(organization.id, email);
    const hasInvitation = await hasActiveOrganizationInviteForEmail(organization.id, email);
    if (hasMembership || hasInvitation) return;
  }

  throw new APIError('FORBIDDEN', {
    message: 'Tài khoản chưa được cấp quyền. Vui lòng liên hệ quản trị đào tạo MP Transformation.'
  });
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  getProfileById: vi.fn(),
  getProfileByEmail: vi.fn(),
  syncProfileEmailVerificationFromAuthUser: vi.fn(),
  updateProfile: vi.fn(),
  getOrganizationByProfileId: vi.fn(),
  ensureLearningInstance: vi.fn(),
  getLicenseStatus: vi.fn()
}));
vi.mock('@cio/db/queries/auth', () => queries);
vi.mock('@cio/db/queries/organization', () => queries);
vi.mock('@api/services/learning-instance', () => queries);
vi.mock('@cio/core/services/license', () => queries);

import { getAccountData } from './profile';

describe('MP Learning account data', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.getProfileById.mockResolvedValue({ id: 'employee', email: 'employee@example.com' });
    queries.ensureLearningInstance.mockResolvedValue({ id: 'mp' });
    queries.getLicenseStatus.mockResolvedValue({ features: [] });
    queries.getOrganizationByProfileId.mockResolvedValue([]);
  });

  it('only returns the company membership with its existing role', async () => {
    const companyMembership = { id: 'mp', roleId: 3 };
    queries.getOrganizationByProfileId.mockResolvedValue([companyMembership, { id: 'legacy', roleId: 1 }]);
    const result = await getAccountData('employee');
    expect(result.organizations).toEqual([companyMembership]);
    expect(queries.ensureLearningInstance).toHaveBeenCalledWith('employee', 'employee@example.com');
  });

  it('does not enroll a user without company membership', async () => {
    const result = await getAccountData('employee');
    expect(result.organizations).toEqual([]);
  });

  it('rejects a missing profile before initializing the company', async () => {
    queries.getProfileById.mockResolvedValue(null);
    await expect(getAccountData('missing')).rejects.toThrow('Account not found');
    expect(queries.ensureLearningInstance).not.toHaveBeenCalled();
  });
});

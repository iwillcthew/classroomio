import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const queries = vi.hoisted(() => ({
  getFirstOrganization: vi.fn(),
  lockLearningInstance: vi.fn(),
  createOrganization: vi.fn(),
  createOrganizationMember: vi.fn(),
  createOrganizationPlan: vi.fn()
}));
const transaction = vi.hoisted(() => vi.fn());
vi.mock('@cio/db/queries/organization', () => queries);
vi.mock('@cio/db/drizzle', () => ({ db: { transaction } }));

import { ensureLearningInstance } from './learning-instance';

describe('MP Learning initialization', () => {
  const transactionClient = { id: 'transaction' };
  const organization = { id: 'mp', name: 'MP Transformation', siteName: 'existing-site' };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv('LMS_ALLOWED_EMAILS', ' Admin@Example.com ');
    queries.getFirstOrganization.mockResolvedValue(null);
    queries.createOrganization.mockResolvedValue(organization);
    queries.createOrganizationMember.mockResolvedValue({ id: 12 });
    transaction.mockImplementation((callback) => callback(transactionClient));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('preserves an existing instance without granting new privileges', async () => {
    queries.getFirstOrganization.mockResolvedValue(organization);
    const result = await ensureLearningInstance('employee', 'employee@example.com');
    expect(result).toBe(organization);
    expect(transaction).not.toHaveBeenCalled();
    expect(queries.createOrganizationMember).not.toHaveBeenCalled();
  });

  it.each(['outsider@example.com', 'fakeadmin@example.com'])('rejects bootstrap by %s', async (email) => {
    await expect(ensureLearningInstance('employee', email)).rejects.toThrow('approved administrator');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('creates the fixed instance and its administrator in the same locked transaction', async () => {
    await ensureLearningInstance('administrator', 'ADMIN@example.com');
    expect(queries.lockLearningInstance).toHaveBeenCalledWith(transactionClient);
    expect(queries.getFirstOrganization).toHaveBeenLastCalledWith(transactionClient);
    expect(queries.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'MP Transformation',
        siteName: 'mp-transformation',
        settings: { language: { locale: 'vi', enforced: false } }
      }),
      transactionClient
    );
    expect(queries.createOrganizationMember).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'mp', profileId: 'administrator', roleId: 1 }),
      transactionClient
    );
    expect(queries.createOrganizationPlan).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'mp', triggeredBy: 12, planName: 'ENTERPRISE', provider: 'selfhosted' }),
      transactionClient
    );
  });

  it('rechecks after acquiring the lock without making a second administrator', async () => {
    queries.getFirstOrganization.mockResolvedValueOnce(null).mockResolvedValueOnce(organization);
    const result = await ensureLearningInstance('second-admin', 'admin@example.com');
    expect(result).toBe(organization);
    expect(queries.lockLearningInstance).toHaveBeenCalledOnce();
    expect(queries.createOrganization).not.toHaveBeenCalled();
    expect(queries.createOrganizationMember).not.toHaveBeenCalled();
  });

  it('propagates a plan failure through the transaction boundary', async () => {
    queries.createOrganizationPlan.mockRejectedValue(new Error('Plan write failed'));
    await expect(ensureLearningInstance('administrator', 'admin@example.com')).rejects.toThrow('Plan write failed');
    expect(transaction).toHaveBeenCalledOnce();
    expect(queries.createOrganizationMember).toHaveBeenCalledWith(expect.anything(), transactionClient);
  });
});

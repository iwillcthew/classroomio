import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@cio/db/queries/organization', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    updateOrganization: vi.fn(),
    getOrganizationById: vi.fn(),
    getFirstOrganization: vi.fn(),
    getActiveOrganizationApiKeyByHash: vi.fn(),
    getFirstOrganizationWithPlans: vi.fn()
  };
});
import {
  getFirstOrganizationWithPlans,
  getFirstOrganization,
  getActiveOrganizationApiKeyByHash,
  getOrganizationById,
  updateOrganization
} from '@cio/db/queries/organization';
import { getOrganizationsWithFilters, updateOrg } from '@api/services/organization';
import { authenticateOrganizationApiKeyService } from './automation-key';

describe('fixed MP Learning organization settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getOrganizationById).mockResolvedValue({ id: 'mp', settings: {} } as never);
    vi.mocked(updateOrganization).mockResolvedValue({ id: 'mp' } as never);
    vi.mocked(getFirstOrganizationWithPlans).mockResolvedValue({ id: 'mp', siteName: 'mp-transformation' } as never);
    vi.mocked(getFirstOrganization).mockResolvedValue({ id: 'mp' } as never);
  });

  it.each([
    { name: 'Another organization' },
    { siteName: 'another-company' },
    { avatarUrl: 'https://example.com/logo.png' },
    { theme: 'red' },
    { customDomain: 'example.com' },
    { isCustomDomainVerified: true },
    { landingpage: {} },
    { parentOrganizationId: 'another-id' }
  ])('rejects identity and tenancy changes: %j', async (settings) => {
    await expect(updateOrg('mp', settings)).rejects.toThrow('managed by the system');
    expect(updateOrganization).not.toHaveBeenCalled();
  });

  it('continues to save learning settings', async () => {
    const settings = { settings: { language: { locale: 'vi' as const, enforced: true } } };
    await updateOrg('mp', settings);
    expect(updateOrganization).toHaveBeenCalledWith('mp', settings);
  });

  it('returns only the fixed company when listing organizations', async () => {
    const organizations = await getOrganizationsWithFilters();
    expect(organizations).toHaveLength(1);
    expect(organizations[0].id).toBe('mp');
  });

  it('does not resolve another tenant by site name', async () => {
    const organizations = await getOrganizationsWithFilters({ siteName: 'another-company' });
    expect(organizations).toEqual([]);
  });

  it('rejects an automation key issued to a legacy organization', async () => {
    vi.mocked(getActiveOrganizationApiKeyByHash).mockResolvedValue({
      organizationId: 'legacy',
      expiresAt: null
    } as never);
    await expect(authenticateOrganizationApiKeyService('legacy-secret')).rejects.toThrow(
      'Invalid organization API key'
    );
  });

  it('accepts an active automation key issued to MP Transformation', async () => {
    const key = { organizationId: 'mp', expiresAt: null };
    vi.mocked(getActiveOrganizationApiKeyByHash).mockResolvedValue(key as never);
    const result = await authenticateOrganizationApiKeyService('company-secret');
    expect(result).toBe(key);
  });
});

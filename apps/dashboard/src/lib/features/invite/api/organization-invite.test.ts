import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationInviteApi } from './organization-invite.svelte';

const { signOut, showError } = vi.hoisted(() => ({ signOut: vi.fn(), showError: vi.fn() }));

vi.mock('$lib/utils/services/api', () => ({
  BaseApiWithErrors: class {
    isLoading = false;
  },
  classroomio: {}
}));

vi.mock('$lib/utils/services/auth/client', () => ({ authClient: { signOut } }));
vi.mock('$features/ui/snackbar/store', () => ({ snackbar: { error: showError } }));
vi.mock('$lib/utils/functions/translations', () => ({ t: { get: vi.fn() } }));

const loginUrl = '/login?redirect=%2Finvite%2Fsecure-token&email=recipient%40example.com';

describe('OrganizationInviteApi.switchAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', { location: { href: '/invite/secure-token' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('ends the old session before opening login for the invited recipient', async () => {
    let finishSignOut!: (result: { error: null }) => void;
    signOut.mockReturnValue(
      new Promise((resolve) => {
        finishSignOut = resolve;
      })
    );
    const inviteApi = new OrganizationInviteApi();

    const switching = inviteApi.switchAccount(loginUrl);

    expect(inviteApi.isLoading).toBe(true);
    expect(window.location.href).toBe('/invite/secure-token');
    await inviteApi.switchAccount(loginUrl);
    expect(signOut).toHaveBeenCalledTimes(1);

    finishSignOut({ error: null });
    await switching;

    expect(window.location.href).toBe(loginUrl);
    expect(inviteApi.isLoading).toBe(false);
  });

  it('stays on the invitation when sign-out is rejected', async () => {
    signOut.mockResolvedValue({ error: { message: 'Unable to end session' } });
    const inviteApi = new OrganizationInviteApi();

    await inviteApi.switchAccount(loginUrl);

    expect(window.location.href).toBe('/invite/secure-token');
    expect(showError).toHaveBeenCalledWith('snackbar.something');
    expect(inviteApi.isLoading).toBe(false);
  });

  it('allows retrying after a network failure', async () => {
    signOut.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ error: null });
    const inviteApi = new OrganizationInviteApi();

    await inviteApi.switchAccount(loginUrl);
    expect(window.location.href).toBe('/invite/secure-token');

    await inviteApi.switchAccount(loginUrl);
    expect(window.location.href).toBe(loginUrl);
    expect(signOut).toHaveBeenCalledTimes(2);
  });
});

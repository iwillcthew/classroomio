import { describe, expect, it } from 'vitest';
import { buildInviteAuthParams, getInviteAuthState } from './invite-auth-utils';

describe('getInviteAuthState', () => {
  it('matches the authenticated email regardless of casing and surrounding whitespace', () => {
    const auth = getInviteAuthState({ id: 'recipient', email: ' Recipient@Example.com ' }, 'recipient@example.com ');

    expect(auth).toEqual({ isAuthenticated: true, isEmailMismatch: false });
  });

  it('requires switching accounts when the session belongs to another recipient', () => {
    const auth = getInviteAuthState({ id: 'administrator', email: 'admin@example.com' }, 'recipient@example.com');

    expect(auth).toEqual({ isAuthenticated: true, isEmailMismatch: true });
  });

  it.each([null, undefined, { id: '', email: 'admin@example.com' }, { id: 'recipient', email: '' }])(
    'does not block an unauthenticated visitor with an email mismatch: %j',
    (sessionUser) => {
      const auth = getInviteAuthState(sessionUser, 'recipient@example.com');

      expect(auth).toEqual({ isAuthenticated: false, isEmailMismatch: false });
    }
  );

  it('updates access after the signed-in account changes', () => {
    const recipientEmail = 'recipient@example.com';
    const previousAuth = getInviteAuthState({ id: 'administrator', email: 'admin@example.com' }, recipientEmail);
    const currentAuth = getInviteAuthState({ id: 'recipient', email: recipientEmail }, recipientEmail);

    expect(previousAuth.isEmailMismatch).toBe(true);
    expect(currentAuth.isEmailMismatch).toBe(false);
  });
});

describe('buildInviteAuthParams', () => {
  it('preserves the invitation and tenant context across authentication', () => {
    const returnPath = '/invite/secure-token?org=mp-transformation';
    const query = buildInviteAuthParams(returnPath, ' recipient+training@example.com ');
    const params = new URLSearchParams(query);

    expect(params.get('redirect')).toBe(returnPath);
    expect(params.get('email')).toBe('recipient+training@example.com');
  });
});

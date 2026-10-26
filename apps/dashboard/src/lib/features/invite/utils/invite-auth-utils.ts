import type { InviteSessionUser } from './types';

export function getInviteAuthState(
  sessionUser: InviteSessionUser | null | undefined,
  inviteEmail: string | null | undefined
) {
  const sessionEmail = sessionUser?.email?.trim().toLowerCase() ?? '';
  const normalizedInviteEmail = inviteEmail?.trim().toLowerCase() ?? '';
  const isAuthenticated = Boolean(sessionUser?.id && sessionEmail);
  const isEmailMismatch = isAuthenticated && Boolean(normalizedInviteEmail) && sessionEmail !== normalizedInviteEmail;

  return { isAuthenticated, isEmailMismatch };
}

export function buildInviteAuthParams(returnPath: string, inviteEmail: string): string {
  const params = new URLSearchParams();
  if (returnPath) params.set('redirect', returnPath);
  if (inviteEmail) params.set('email', inviteEmail.trim());

  return params.toString();
}

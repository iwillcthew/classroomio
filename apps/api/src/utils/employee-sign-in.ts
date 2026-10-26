import { getEmployeeByIdentity } from '@cio/db/queries/organization';

export async function resolveEmployeeSignInRequest(request: Request) {
  const pathname = new URL(request.url).pathname;
  if (request.method !== 'POST' || !pathname.endsWith('/sign-in/email')) return request;

  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return request;
  }
  if (!body || typeof body !== 'object' || !('email' in body) || typeof body.email !== 'string') return request;

  const identity = body.email.trim();
  const match = await getEmployeeByIdentity(identity);
  const allowed =
    match?.employee.status === 'ACTIVE' && match.member.status === 'ACTIVE' && !!match.employee.activatedAt;
  const email = match
    ? allowed
      ? match.employee.email
      : 'invalid-credential@example.invalid'
    : identity.includes('@')
      ? identity
      : 'invalid-credential@example.invalid';
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  const normalizedBody = JSON.stringify({ ...body, email });
  return new Request(request.url, { method: request.method, headers, body: normalizedBody });
}

import { findEmployeeByCode, findEmployeeByEmail, getLegacyEmailLoginContext } from '@cio/db/queries/workforce';
import { ZEmployeeCode } from '@cio/utils/validation/organization';

export async function rewriteEmployeeAuthRequest(request: Request) {
  const url = new URL(request.url);
  if (request.method !== 'POST') return request;

  if (url.pathname === '/api/auth/sign-in/email') {
    const original = (await request
      .clone()
      .json()
      .catch(() => ({}))) as { email?: unknown };
    const email = typeof original.email === 'string' ? original.email.trim().toLowerCase() : '';
    const employee = email ? await findEmployeeByEmail(email) : null;
    const legacy = !employee && email ? await getLegacyEmailLoginContext(email) : null;
    if (legacy && (legacy.hasAdminMembership || !legacy.organizationExists)) return request;

    const body = { ...original, email: 'invalid-employee@example.invalid' };
    const headers = new Headers(request.headers);
    headers.delete('content-length');
    return new Request(url, { method: 'POST', headers, body: JSON.stringify(body) });
  }
  if (url.pathname !== '/api/auth/sign-in/employee') return request;

  const body = (await request
    .clone()
    .json()
    .catch(() => ({}))) as { employeeCode?: unknown; password?: unknown };
  const parsed = ZEmployeeCode.safeParse(body.employeeCode);
  const found = parsed.success ? await findEmployeeByCode(parsed.data) : null;
  const email = found?.employee.status === 'ACTIVE' ? found.email : 'invalid-employee@example.invalid';
  url.pathname = '/api/auth/sign-in/email';
  const payload = { email, password: body.password };
  const headers = new Headers(request.headers);
  headers.delete('content-length');
  headers.set('content-type', 'application/json');
  return new Request(url, { method: 'POST', headers, body: JSON.stringify(payload) });
}

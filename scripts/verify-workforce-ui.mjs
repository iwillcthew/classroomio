import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const requireRoot = createRequire(resolve('package.json'));
const requireDatabase = createRequire(resolve('packages/db/package.json'));
const { chromium } = requireRoot('@playwright/test');
const { parse } = requireDatabase('dotenv');
const credentials = parse(readFileSync('.env.local'));
const dashboard = parse(readFileSync('apps/dashboard/.env'));
const origin = process.env.WORKFORCE_PREVIEW_URL || 'http://localhost:5184';
const apiOrigin = (dashboard.PUBLIC_SERVER_URL || 'http://localhost:3081').replace(/\/api\/auth\/?$/, '');
const login = await fetch(`${apiOrigin}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'http://localhost:3082' },
  body: JSON.stringify({ email: credentials.MP_TEST_EMAIL, password: credentials.MP_TEST_PASSWORD })
});
assert.equal(login.status, 200, 'Local verification administrator can sign in');
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, locale: 'vi-VN' });
const cookies = login.headers.getSetCookie().map((cookie) => {
  const pair = cookie.split(';')[0];
  const separator = pair.indexOf('=');
  return {
    name: pair.slice(0, separator),
    value: pair.slice(separator + 1),
    url: origin,
    httpOnly: cookie.toLowerCase().includes('httponly'),
    sameSite: 'Lax'
  };
});
await context.addCookies(cookies);
const employeeId = '11111111-1111-4111-8111-111111111111';
const unitId = '22222222-2222-4222-8222-222222222222';
const titleId = '33333333-3333-4333-8333-333333333333';
const courseId = '44444444-4444-4444-8444-444444444444';
const profileId = '55555555-5555-4555-8555-555555555555';
const unit = { id: unitId, code: 'MP-OPS', name: 'Đơn vị vận hành', leaderId: employeeId };
const title = { id: titleId, code: 'CV', name: 'Chuyên viên' };
const employee = {
  id: employeeId,
  organizationId: profileId,
  employeeCode: 'MP001',
  profileId,
  unitId,
  jobTitleId: titleId,
  managerId: null,
  status: 'ACTIVE',
  accessRole: 'EMPLOYEE',
  activatedAt: new Date().toISOString()
};
const rows = [
  {
    employee,
    fullname: 'Nhân viên thử nghiệm',
    email: 'demo@example.invalid',
    unit: unit.name,
    jobTitle: title.name,
    effectiveManagerId: null
  }
];
const pageErrors = [];
await context.route('**/*', async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/proxy/, '');
  if (!path.startsWith('/workforce')) return route.continue();

  const headers = {
    'content-type': 'application/json',
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': 'content-type,cio-org-id',
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,OPTIONS'
  };
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });

  let data;
  if (path === '/workforce') {
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const visible = rows.filter((row) => `${row.employee.employeeCode} ${row.fullname}`.toLowerCase().includes(search));
    const people = rows.map((row) => ({ ...row.employee, fullname: row.fullname, email: row.email }));
    data = {
      actor: {
        canManage: true,
        isSystemAdmin: true,
        unitIds: [],
        reportIds: [],
        active: true,
        profileId,
        employeeId: null
      },
      employees: { rows: visible, total: visible.length, page: 1, limit: 25 },
      units: [unit],
      jobTitles: [title],
      people,
      courses: [{ id: courseId, title: 'Đào tạo hội nhập', groupId: profileId }],
      exams: [],
      paths: [],
      pathCourses: [],
      rules: [],
      targets: []
    };
  } else if (path === '/workforce/assignments') data = { assignments: [], paths: [] };
  else if (path === '/workforce/activation')
    data =
      request.method() === 'POST'
        ? { employeeCode: 'MP003' }
        : {
            fullname: 'Nhân viên kích hoạt',
            employeeCode: 'MP003',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          };
  else if (path === '/workforce/reports')
    data = [
      { unitId, unit: unit.name, employees: rows.length, assigned: 4, completed: 3, remaining: 1, completionRate: 75 }
    ];
  else if (path === '/workforce/employees' && request.method() === 'POST') {
    const fields = request.postDataJSON();
    const created = {
      ...employee,
      ...fields,
      id: '66666666-6666-4666-8666-666666666666',
      status: 'DRAFT',
      activatedAt: null
    };
    rows.push({
      employee: created,
      fullname: fields.fullname,
      email: fields.email,
      unit: null,
      jobTitle: null,
      effectiveManagerId: null
    });
    data = { employee: created, activation: { queued: false } };
  } else if (path.endsWith('/history')) data = [];
  else data = {};
  return route.fulfill({ status: 200, headers, body: JSON.stringify({ success: true, data }) });
});
try {
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/lms/workforce`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.getByTestId('workforce-tab-employees').waitFor({ timeout: 60_000 });
  await page.getByText('MP001', { exact: true }).waitFor();
  await page.getByTestId('employee-add').click();
  await page.getByTestId('employee-code').fill('MP002');
  await page.getByTestId('employee-fullname').fill('Nhân viên mới');
  await page.getByTestId('employee-email').fill('new@example.invalid');
  await page.getByTestId('employee-save-draft').click();
  await page.getByText('MP002', { exact: true }).waitFor();
  await page.getByTestId('employee-edit-MP001').click();
  assert.equal(await page.getByTestId('employee-code').isDisabled(), true);
  await page.getByTestId('employee-editor-cancel').click();
  await page.getByTestId('workforce-tab-training').click();
  await page.getByTestId('workforce-rule-save').waitFor();
  await page.getByText('Đào tạo hội nhập', { exact: true }).first().waitFor();
  await page.getByTestId('workforce-tab-reports').click();
  await page.getByText('75%', { exact: true }).waitFor();
  mkdirSync('reports/workforce', { recursive: true });
  await page.screenshot({ path: 'reports/workforce/unit-report.png', fullPage: true, animations: 'disabled' });
  await page.getByTestId('workforce-tab-employees').click();
  await page.screenshot({ path: 'reports/workforce/hr-workspace.png', fullPage: true, animations: 'disabled' });
  await context.clearCookies();
  await page.goto(`${origin}/activate?token=${'a'.repeat(64)}`, { waitUntil: 'domcontentloaded' });
  await page.getByText('MP003', { exact: true }).waitFor();
  await page.locator('#activation-password').fill('VerificationPassword-2026!');
  await page.locator('#activation-confirm').fill('VerificationPassword-2026!');
  await page.getByTestId('employee-activate-submit').click();
  await page.getByTestId('employee-activation-success').waitFor();
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  console.log(
    'PASS HR workspace renders, creates drafts, protects employee codes and shows training rules and unit reports.'
  );
} finally {
  await browser.close();
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  await fetch(`${apiOrigin}/api/auth/sign-out`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3082', cookie: cookieHeader },
    body: '{}'
  }).catch(() => null);
}

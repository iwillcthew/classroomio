import { describe, expect, it } from 'vitest';
import {
  EMAIL_LOCALES,
  EMPLOYEE_EMAIL_IDS,
  STUDENT_EMAIL_CATALOG,
  getStudentEmailSampleValues,
  getUnknownStudentEmailVariables
} from '@cio/utils/email';
import { employeeActivationEmail } from '../src/emails/employee-activation';

describe('employee activation templates', () => {
  it.each(EMAIL_LOCALES)('renders the %s default with protected activation and escaped employee data', (locale) => {
    const fields = {
      orgName: 'MP Transformation',
      employeeName: '<script>Employee</script>',
      employeeCode: 'MP001',
      expiresAt: '31/10/2026',
      activationUrl: 'https://example.com/activate?token=single-use',
      branding: {}
    };
    const rendered = employeeActivationEmail.template.render(fields, { locale });
    expect(rendered).toContain('MP001');
    expect(rendered).toContain('&lt;script&gt;Employee&lt;/script&gt;');
    expect(rendered).not.toContain('<script>Employee</script>');
    expect(rendered).toContain('href="https://example.com/activate?token=single-use"');
    expect(rendered).not.toMatch(/{{[a-z_]+}}/);
    const copy = STUDENT_EMAIL_CATALOG[locale].templates.employeeActivation;
    expect(getUnknownStudentEmailVariables('employeeActivation', copy.body)).toEqual([]);
    expect(getStudentEmailSampleValues(locale, 'MP Transformation').employee_code).toBe('MP001');
  });

  it('applies saved body and subject while retaining the activation action', () => {
    const fields = {
      orgName: 'MP Transformation',
      employeeName: 'Employee',
      employeeCode: 'MP002',
      expiresAt: '31/10/2026',
      activationUrl: 'https://example.com/activate?token=single-use',
      branding: {}
    };
    const context = {
      locale: 'vi' as const,
      contentOverride: '<p>Xin chào {{employee_name}} - {{employee_code}} tại {{org_name}}</p>',
      subjectOverride: 'Kích hoạt {{employee_code}}'
    };
    const rendered = employeeActivationEmail.template.render(fields, context);
    const subject = employeeActivationEmail.template.subject;
    expect(rendered).toContain('Xin chào Employee - MP002 tại MP Transformation');
    expect(rendered).toContain('Kích hoạt tài khoản');
    expect(rendered).toContain(fields.activationUrl);
    expect(typeof subject === 'function' && subject(fields, context)).toBe('Kích hoạt MP002');
    expect(EMPLOYEE_EMAIL_IDS).not.toContain('studentCourseInvite');
    expect(EMPLOYEE_EMAIL_IDS).not.toContain('studentOrgInvite');
    expect(EMPLOYEE_EMAIL_IDS).not.toContain('studentProvePayment');
  });
});

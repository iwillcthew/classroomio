import * as z from 'zod';
import { defineEmail } from '../send';
import { ZEmailBranding } from '../core/branding';
import { renderStudentEmail, renderStudentEmailSubject } from '../core/student-email';

function activationValues(fields: { orgName: string; employeeName: string; employeeCode: string; expiresAt: string }) {
  return {
    org_name: fields.orgName,
    employee_name: fields.employeeName,
    employee_code: fields.employeeCode,
    expires_at: fields.expiresAt
  };
}

export const employeeActivationEmail = defineEmail({
  id: 'employeeActivation',
  schema: z.object({
    orgName: z.string().min(1),
    employeeName: z.string().min(1),
    employeeCode: z.string().min(1),
    expiresAt: z.string().min(1),
    activationUrl: z.url(),
    branding: ZEmailBranding
  }),
  subject: (fields, context) => {
    const values = activationValues(fields);
    return renderStudentEmailSubject('employeeActivation', values, context);
  },
  render: (fields, context) => {
    const values = activationValues(fields);
    return renderStudentEmail({
      id: 'employeeActivation',
      values,
      actionUrl: fields.activationUrl,
      branding: fields.branding,
      context
    });
  }
});

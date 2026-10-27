import {
  deleteOrganizationStudentEmailTemplate,
  getOrganizationById,
  listOrganizationStudentEmailTemplates,
  upsertOrganizationStudentEmailTemplate
} from '@cio/db/queries/organization';
import {
  STUDENT_EMAIL_LINKS,
  getStudentEmailSampleValues,
  containsStudentEmailActionLink,
  getUnknownStudentEmailVariables,
  isEmailLocale,
  isEmployeeEmailId,
  isStudentEmailTemplateCustomized,
  type EmailLocale,
  type StudentEmailId
} from '@cio/utils/email';
import { canCustomizeStudentEmails } from '@cio/core/services/email/localization';
import { sanitizeHtml } from '@cio/core/utils/sanitize-html';
import {
  buildEmailBranding,
  buildEmailFromName,
  renderStudentEmail,
  renderStudentEmailSubject,
  sanitizeEmailSubject
} from '@cio/email';
import { AppError, ErrorCodes } from '@api/utils/errors';
import { enqueueRawEmail } from '@api/services/jobs/email-jobs';
import { getDashboardBaseUrl } from '@cio/core/config/dashboard-url';

export async function listStudentEmailTemplates(organizationId: string) {
  const templates = await listOrganizationStudentEmailTemplates(organizationId);

  return templates.flatMap((template) => {
    const emailId = template.emailId;
    const locale = template.locale;
    if (!isEmployeeEmailId(emailId) || !isEmailLocale(locale)) return [];

    return [
      {
        ...template,
        emailId,
        locale,
        isCustomized: isStudentEmailTemplateCustomized({
          emailId,
          locale,
          content: template.content,
          subject: template.subject
        })
      }
    ];
  });
}

export async function saveStudentEmailTemplate(input: {
  organizationId: string;
  emailId: StudentEmailId;
  locale: EmailLocale;
  content: string;
  subject?: string | null;
}) {
  assertActiveEmployeeTemplate(input.emailId);

  await assertStudentEmailCustomizationEntitlement(input.organizationId);
  const content = sanitizeHtml(input.content);
  validateTemplateContent(input.emailId, content);
  const subject = input.subject == null ? input.subject : sanitizeEmailSubject(input.subject);
  if (subject) validateTemplateVariables(input.emailId, subject);

  const template = await upsertOrganizationStudentEmailTemplate({
    ...input,
    content,
    subject
  });

  return {
    ...template,
    isCustomized: isStudentEmailTemplateCustomized({
      emailId: input.emailId,
      locale: input.locale,
      content: template.content,
      subject: template.subject
    })
  };
}

export async function resetStudentEmailTemplate(organizationId: string, emailId: StudentEmailId, locale: EmailLocale) {
  assertActiveEmployeeTemplate(emailId);

  await assertStudentEmailCustomizationEntitlement(organizationId);

  return deleteOrganizationStudentEmailTemplate(organizationId, emailId, locale);
}

export async function sendStudentEmailTemplateTest(input: {
  organizationId: string;
  emailId: StudentEmailId;
  locale: EmailLocale;
  content: string;
  subject: string;
  recipientEmails: string[];
}) {
  assertActiveEmployeeTemplate(input.emailId);

  await assertStudentEmailCustomizationEntitlement(input.organizationId);
  const draftContent = sanitizeHtml(input.content);
  validateTemplateContent(input.emailId, draftContent);
  validateTemplateVariables(input.emailId, input.subject);

  const organization = await getOrganizationById(input.organizationId);
  if (!organization) {
    throw new AppError('Organization not found', ErrorCodes.ORGANIZATION_NOT_FOUND, 404);
  }

  const sampleValues = getStudentEmailSampleValues(input.locale, organization.name);
  const context = { locale: input.locale, contentOverride: draftContent, subjectOverride: input.subject };
  const branding = buildEmailBranding(organization);
  const actionUrl = getDashboardBaseUrl(organization);
  const content = renderStudentEmail({
    id: input.emailId,
    values: sampleValues,
    actionUrl,
    branding,
    context
  });
  const subject = renderStudentEmailSubject(input.emailId, sampleValues, context);
  const from = buildEmailFromName(organization.name);
  const result = await enqueueRawEmail({
    to: input.recipientEmails,
    subject,
    content,
    from
  });

  if (result.jobIds.length === 0) {
    throw new AppError(
      'Email could not be queued. Check that Redis and the email worker are running.',
      ErrorCodes.INTERNAL_ERROR,
      503
    );
  }

  return { queued: true };
}

function validateTemplateContent(emailId: StudentEmailId, content: string) {
  validateTemplateVariables(emailId, content);

  if (containsStudentEmailActionLink(content) && !STUDENT_EMAIL_LINKS[emailId]) {
    throw new AppError('This email template does not have an action link.', ErrorCodes.VALIDATION_ERROR, 400);
  }
}

function assertActiveEmployeeTemplate(emailId: StudentEmailId) {
  if (!isEmployeeEmailId(emailId)) {
    throw new AppError('This email template is no longer used', ErrorCodes.NOT_FOUND, 404);
  }
}

function validateTemplateVariables(emailId: StudentEmailId, content: string) {
  const unknownVariables = getUnknownStudentEmailVariables(emailId, content);
  if (unknownVariables.length > 0) {
    throw new AppError(
      `Unknown template placeholders: ${unknownVariables.map((variable) => `{{${variable}}}`).join(', ')}`,
      ErrorCodes.VALIDATION_ERROR,
      400
    );
  }
}

async function assertStudentEmailCustomizationEntitlement(organizationId: string) {
  if (!(await canCustomizeStudentEmails(organizationId))) {
    throw new AppError('Student email customization requires a paid plan', ErrorCodes.UPGRADE_REQUIRED, 403);
  }
}

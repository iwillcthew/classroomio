import { env } from '../config/env';

export const EMAIL_IDS = [
  'employeeActivation',
  'forgotPassword',
  'inviteTeacher',
  'newsfeedComment',
  'newsfeedPost',
  'onPasswordReset',
  'cohortGoalReminder',
  'quizAssigned',
  'sessionReminder',
  'sessionUpdated',
  'submissionGraded',
  'submissionReceived',
  'earlyAdopterReady',
  'earlyAdopterReminder',
  'studentLimitReached',
  'studentLimitApproaching',
  'contentReportAlert',
  'webhookFailing',
  'webhookDisabled',
  'studentCourseInvite',
  'studentCourseCompletion',
  'studentCourseWelcome',
  'studentOrgInvite',
  'studentCohortWelcome',
  'studentProvePayment',
  'teacherCourseWelcome',
  'teacherStudentBuyRequest',
  'teacherStudentJoined',
  'verifyEmail',
  'welcome'
] as const;

const DEFAULT_EMAIL_FROM = '"MP Learning" <noreply@example.invalid>';

export const EMAIL_FROM = env.SMTP_SENDER || DEFAULT_EMAIL_FROM;
export const EMAIL_REPLY_TO = env.SMTP_SENDER || DEFAULT_EMAIL_FROM;

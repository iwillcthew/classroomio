import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { course, exercise, organization, profile } from './schema';

export const workforceUnit = pgTable(
  'workforce_unit',
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id),
    code: text().notNull(),
    name: text().notNull(),
    leaderId: uuid('leader_id')
      .notNull()
      .references((): AnyPgColumn => workforceEmployee.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull()
  },
  (table) => [uniqueIndex('workforce_unit_org_code').on(table.organizationId, table.code)]
);

export const workforceJobTitle = pgTable(
  'workforce_job_title',
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id),
    code: text().notNull(),
    name: text().notNull()
  },
  (table) => [uniqueIndex('workforce_title_org_code').on(table.organizationId, table.code)]
);

export const workforceEmployee = pgTable(
  'workforce_employee',
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id),
    employeeCode: text('employee_code').notNull(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profile.id),
    unitId: uuid('unit_id').references((): AnyPgColumn => workforceUnit.id),
    jobTitleId: uuid('job_title_id').references(() => workforceJobTitle.id),
    managerId: uuid('manager_id').references((): AnyPgColumn => workforceEmployee.id),
    accessRole: text('access_role').notNull().default('EMPLOYEE'),
    status: text().notNull().default('DRAFT'),
    activatedAt: timestamp('activated_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('workforce_employee_code_unique').on(table.employeeCode),
    uniqueIndex('workforce_employee_profile_unique').on(table.profileId),
    check('workforce_employee_code_format', sql`${table.employeeCode} ~ '^[A-Z0-9][A-Z0-9._-]{0,39}$'`),
    check(
      'workforce_employee_status_check',
      sql`${table.status} IN ('DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED')`
    ),
    check('workforce_employee_role_check', sql`${table.accessRole} IN ('EMPLOYEE', 'HR', 'INSTRUCTOR')`),
    index('workforce_employee_org_unit_title').on(table.organizationId, table.unitId, table.jobTitleId)
  ]
);

export const workforceHistory = pgTable(
  'workforce_history',
  {
    id: uuid().defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organization.id),
    employeeId: uuid('employee_id').references(() => workforceEmployee.id),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => profile.id),
    event: text().notNull(),
    reason: text().notNull(),
    changes: jsonb().notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull()
  },
  (table) => [index('workforce_history_employee').on(table.organizationId, table.employeeId, table.createdAt)]
);

export const workforceActivation = pgTable('workforce_activation', {
  id: uuid().defaultRandom().primaryKey(),
  employeeId: uuid('employee_id')
    .notNull()
    .references(() => workforceEmployee.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull()
});

export const workforceLearningPath = pgTable('workforce_learning_path', {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organization.id),
  name: text().notNull(),
  jobTitleId: uuid('job_title_id')
    .notNull()
    .references(() => workforceJobTitle.id)
});

export const workforcePathCourse = pgTable(
  'workforce_path_course',
  {
    id: uuid().defaultRandom().primaryKey(),
    pathId: uuid('path_id')
      .notNull()
      .references(() => workforceLearningPath.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => course.id),
    position: integer().notNull()
  },
  (table) => [uniqueIndex('workforce_path_course_unique').on(table.pathId, table.courseId)]
);

export const workforceTrainingRule = pgTable('workforce_training_rule', {
  id: uuid().defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organization.id),
  name: text().notNull(),
  unitId: uuid('unit_id').references(() => workforceUnit.id),
  jobTitleId: uuid('job_title_id').references(() => workforceJobTitle.id),
  enabled: boolean().notNull().default(true)
});

export const workforceRuleTarget = pgTable(
  'workforce_rule_target',
  {
    id: uuid().defaultRandom().primaryKey(),
    ruleId: uuid('rule_id')
      .notNull()
      .references(() => workforceTrainingRule.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id').references(() => course.id),
    examId: uuid('exam_id').references(() => exercise.id),
    pathId: uuid('path_id').references(() => workforceLearningPath.id)
  },
  (table) => [
    check(
      'workforce_target_single_resource',
      sql`num_nonnulls(${table.courseId}, ${table.examId}, ${table.pathId}) = 1`
    )
  ]
);

export const workforceAssignment = pgTable(
  'workforce_assignment',
  {
    id: uuid().defaultRandom().primaryKey(),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => workforceEmployee.id),
    courseId: uuid('course_id').references(() => course.id),
    examId: uuid('exam_id').references(() => exercise.id),
    pathId: uuid('path_id').references(() => workforceLearningPath.id),
    ruleId: uuid('rule_id').references(() => workforceTrainingRule.id),
    sourceUnitId: uuid('source_unit_id').references(() => workforceUnit.id),
    sourceJobTitleId: uuid('source_job_title_id').references(() => workforceJobTitle.id),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull()
  },
  (table) => [
    check(
      'workforce_assignment_single_resource',
      sql`num_nonnulls(${table.courseId}, ${table.examId}, ${table.pathId}) = 1`
    ),
    uniqueIndex('workforce_assignment_course')
      .on(table.employeeId, table.courseId)
      .where(sql`${table.courseId} IS NOT NULL`),
    uniqueIndex('workforce_assignment_exam')
      .on(table.employeeId, table.examId)
      .where(sql`${table.examId} IS NOT NULL`),
    uniqueIndex('workforce_assignment_path')
      .on(table.employeeId, table.pathId)
      .where(sql`${table.pathId} IS NOT NULL`)
  ]
);

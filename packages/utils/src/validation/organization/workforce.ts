import { z } from 'zod';

export const ZEmployeeCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9._-]{0,39}$/);
export const ZWorkforceFilters = z.object({
  search: z.string().trim().max(150).default(''),
  unitId: z.string().uuid().optional(),
  jobTitleId: z.string().uuid().optional(),
  status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});
export const ZCreateEmployee = z
  .object({
    employeeCode: ZEmployeeCode,
    fullname: z.string().trim().min(2).max(150),
    email: z.email().trim().toLowerCase(),
    unitId: z.string().uuid().nullable().default(null),
    jobTitleId: z.string().uuid().nullable().default(null),
    managerId: z.string().uuid().nullable().default(null),
    accessRole: z.enum(['EMPLOYEE', 'HR', 'INSTRUCTOR']).default('EMPLOYEE'),
    sendActivation: z.boolean().default(false)
  })
  .strict();
export const ZUpdateEmployee = ZCreateEmployee.omit({ employeeCode: true, sendActivation: true })
  .partial()
  .extend({
    status: z.enum(['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED']).optional(),
    reason: z.string().trim().min(1).max(1000)
  })
  .strict();
export const ZWorkforceUnit = z
  .object({
    name: z.string().trim().min(2).max(150),
    code: z.string().trim().toUpperCase().min(1).max(40),
    leaderId: z.string().uuid()
  })
  .strict();
export const ZJobTitle = z
  .object({ name: z.string().trim().min(2).max(150), code: z.string().trim().toUpperCase().min(1).max(40) })
  .strict();
export const ZTrainingRule = z
  .object({
    name: z.string().trim().min(2).max(150),
    unitId: z.string().uuid().nullable().default(null),
    jobTitleId: z.string().uuid().nullable().default(null),
    courseIds: z.array(z.string().uuid()).max(100).default([]),
    examIds: z.array(z.string().uuid()).max(100).default([]),
    pathIds: z.array(z.string().uuid()).max(100).default([]),
    enabled: z.boolean().default(true)
  })
  .strict()
  .refine((rule) => rule.courseIds.length + rule.examIds.length + rule.pathIds.length > 0);
export const ZLearningPath = z
  .object({
    name: z.string().trim().min(2).max(150),
    jobTitleId: z.string().uuid(),
    courseIds: z.array(z.string().uuid()).min(1).max(100)
  })
  .strict();
export const ZEmployeeActivation = z
  .object({ token: z.string().min(40).max(200), password: z.string().min(12).max(128) })
  .strict();
export const ZEmployeeActivationToken = z.object({ token: z.string().min(40).max(200) });
export const ZEmployeeImport = z.object({ employees: z.array(ZCreateEmployee).min(1).max(1000) }).strict();
export const ZEmployeeId = z.object({ employeeId: z.string().uuid() });
export const ZWorkforceResourceId = z.object({ resourceId: z.string().uuid() });
export type TCreateEmployee = z.infer<typeof ZCreateEmployee>;
export type TUpdateEmployee = z.infer<typeof ZUpdateEmployee>;
export type TWorkforceFilters = z.infer<typeof ZWorkforceFilters>;
export const ZWorkforceProfileQuery = ZWorkforceFilters.pick({ search: true, unitId: true, jobTitleId: true }).extend({
  courseId: z.string().uuid().optional()
});
export type TWorkforceProfileQuery = z.infer<typeof ZWorkforceProfileQuery>;
export type TWorkforceMemberFilters = Partial<Pick<TWorkforceFilters, 'unitId' | 'jobTitleId' | 'search'>>;
export type TWorkforceUnit = z.infer<typeof ZWorkforceUnit>;
export type TJobTitle = z.infer<typeof ZJobTitle>;
export type TTrainingRule = z.infer<typeof ZTrainingRule>;
export type TLearningPath = z.infer<typeof ZLearningPath>;

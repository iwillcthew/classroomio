import * as z from 'zod';

export const ZAssignCourseTraining = z
  .object({
    profileIds: z.array(z.uuid()).min(1).max(100),
    required: z.boolean().default(true),
    dueDate: z.iso.datetime({ offset: true }).nullable().default(null),
    message: z.string().trim().max(2000).default(''),
    sendEmail: z.boolean().default(true)
  })
  .strict()
  .refine((value) => new Set(value.profileIds).size === value.profileIds.length, {
    message: 'Duplicate learners are not allowed',
    path: ['profileIds']
  });
export type TAssignCourseTraining = z.infer<typeof ZAssignCourseTraining>;

export const ZRevokeCourseSource = z.object({ courseId: z.uuid(), sourceId: z.uuid() });

import * as z from 'zod';

export const ZLearningAnalyticsQuery = z.object({
  unitId: z.string().uuid().optional(),
  jobTitleId: z.string().uuid().optional(),
  search: z.string().trim().max(150).optional(),
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30)
});

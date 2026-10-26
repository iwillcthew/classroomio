import * as z from 'zod';

export const ZLearningAnalyticsQuery = z.object({
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30)
});

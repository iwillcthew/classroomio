import { describe, expect, it } from 'vitest';
import { ZGetRecommendedCourses } from '../src/validation/course/course';

describe('internal library query', () => {
  it('accepts a trimmed Vietnamese search with pagination and server sorting', () => {
    const query = ZGetRecommendedCourses.parse({ search: '  Hội nhập  ', page: '2', limit: '12', sort: 'lessons' });
    expect(query).toEqual({ search: 'Hội nhập', page: 2, limit: 12, sort: 'lessons' });
  });

  it.each([
    { page: '1.5' },
    { page: '0' },
    { limit: '51' },
    { limit: '2.5' },
    { sort: 'unknown' },
    { search: 'a'.repeat(201) }
  ])('rejects invalid library parameters %j', (query) => {
    expect(ZGetRecommendedCourses.safeParse(query).success).toBe(false);
  });
});

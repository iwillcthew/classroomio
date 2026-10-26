import { describe, expect, it } from 'vitest';
import type { UserEnrolledCourses } from '$features/course/types';
import { CourseSortBy } from '$features/course/utils/constants';
import { filterLearningCourses, getLearningSummary, prioritizeLearningCourses } from './learning-overview';

function course(overrides: Partial<UserEnrolledCourses[number]>): UserEnrolledCourses[number] {
  return {
    id: 'course',
    title: 'Khóa học',
    type: 'SELF_PACED',
    lessonCount: 10,
    exerciseCount: 0,
    progressRate: 0,
    exercisesCompleted: 0,
    createdAt: '2026-10-01T00:00:00Z',
    ...overrides
  } as UserEnrolledCourses[number];
}

describe('employee learning priorities', () => {
  it('puts dated required learning before undated courses, even when undated courses have more progress', () => {
    const optional = course({ id: 'optional', progressRate: 9 });
    const required = course({ id: 'required', type: 'COMPLIANCE', complianceDueDate: '2026-10-26T00:00:00Z' });
    expect(prioritizeLearningCourses([optional, required]).map((entry) => entry.id)).toEqual(['required', 'optional']);
  });

  it('orders required courses by deadline and ignores invalid deadlines', () => {
    const later = course({ id: 'later', type: 'COMPLIANCE', complianceDueDate: '2026-10-28T00:00:00Z' });
    const earlier = course({ id: 'earlier', type: 'COMPLIANCE', complianceDueDate: '2026-10-20T00:00:00Z' });
    const invalid = course({ id: 'invalid', type: 'COMPLIANCE', complianceDueDate: 'invalid' });
    expect(prioritizeLearningCourses([invalid, later, earlier]).map((entry) => entry.id)).toEqual([
      'earlier',
      'later',
      'invalid'
    ]);
  });

  it('excludes compliant and waived records from overdue work while retaining incomplete assessments', () => {
    const courses = [
      course({
        id: 'waived',
        type: 'COMPLIANCE',
        complianceStatus: 'waived',
        complianceDueDate: '2026-10-01T00:00:00Z'
      }),
      course({
        id: 'compliant',
        type: 'COMPLIANCE',
        complianceStatus: 'compliant',
        complianceDueDate: '2026-10-01T00:00:00Z'
      }),
      course({
        id: 'overdue',
        type: 'COMPLIANCE',
        complianceStatus: 'non_compliant',
        complianceDueDate: '2026-10-20T00:00:00Z'
      }),
      course({ id: 'assessment', progressRate: 10, exerciseCount: 1 })
    ];
    const summary = getLearningSummary(courses, Date.parse('2026-10-25T00:00:00Z'));
    expect(summary.completed).toHaveLength(2);
    expect(summary.overdue.map((entry) => entry.id)).toEqual(['overdue']);
    expect(summary.pending.map((entry) => entry.id)).toContain('assessment');
  });

  it('matches Vietnamese without accents or case and never mutates the source list', () => {
    const courses = [
      course({ id: 'older', title: 'Đào tạo Hội nhập' }),
      course({ id: 'newer', title: 'HỘI NHẬP MP', createdAt: '2026-10-24T00:00:00Z' })
    ];
    const filtered = filterLearningCourses(courses, 'hoi nhap', CourseSortBy.DateCreated);
    expect(filtered.map((entry) => entry.id)).toEqual(['newer', 'older']);
    expect(courses.map((entry) => entry.id)).toEqual(['older', 'newer']);
    expect(filterLearningCourses(courses, 'dao tao', CourseSortBy.DateCreated)).toHaveLength(1);
  });

  it('handles empty learning assignments without a fictitious completion rate', () => {
    const summary = getLearningSummary([], Date.now());
    expect(summary.progress).toBe(0);
    expect(summary.pending).toEqual([]);
    expect(summary.totalItems).toBe(0);
  });
});

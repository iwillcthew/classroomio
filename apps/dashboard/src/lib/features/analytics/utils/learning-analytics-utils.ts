import type { ExportDocument } from '@cio/utils/export';
import type { LearningCourseFilter, LearningReportCourse, LearningReportDay } from './types';

export function filterLearningReportCourses(
  courses: LearningReportCourse[],
  search: string,
  filter: LearningCourseFilter
) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/gi, 'd')
      .toLocaleLowerCase('vi')
      .trim();
  const normalizedSearch = normalize(search);
  return courses.filter((course) => {
    if (filter === 'overdue' && course.overdue === 0) return false;

    if (filter === 'assigned' && course.assigned === 0) return false;

    return normalize(course.title).includes(normalizedSearch);
  });
}

export function getLearningActivityScale(days: LearningReportDay[]) {
  return Math.max(1, ...days.map((day) => Math.max(day.lessons, day.submissions)));
}

export function buildLearningExport(
  courses: LearningReportCourse[],
  title: string,
  subtitle: string,
  headers: {
    course: string;
    assigned: string;
    notStarted: string;
    inProgress: string;
    completed: string;
    overdue: string;
    progress: string;
  }
): ExportDocument<LearningReportCourse> {
  return {
    filename: 'mp-learning-training-report',
    title,
    subtitle,
    columns: [
      { key: 'course', header: headers.course, value: (row) => row.title },
      { key: 'assigned', header: headers.assigned, value: (row) => row.assigned },
      { key: 'notStarted', header: headers.notStarted, value: (row) => row.notStarted },
      { key: 'inProgress', header: headers.inProgress, value: (row) => row.inProgress },
      { key: 'completed', header: headers.completed, value: (row) => row.completed },
      { key: 'overdue', header: headers.overdue, value: (row) => row.overdue },
      { key: 'progress', header: headers.progress, value: (row) => (row.progress === null ? null : `${row.progress}%`) }
    ],
    rows: courses
  };
}

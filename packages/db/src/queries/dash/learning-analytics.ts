import {
  learningMembershipSql,
  courseRequiredSql,
  courseDeadlineSql,
  courseAssignedSql
} from '../course/learning-access';
import { db, type DbOrTxClient } from '@db/drizzle';
import { sql } from 'drizzle-orm';
import { submissionMeetsCompletionPolicySql } from '../course/progression';

export type LearningCourseReport = {
  id: string;
  title: string;
  type: string | null;
  isPublished: boolean;
  assigned: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  progress: number | null;
};

export type LearningEmployeeReport = {
  id: string;
  fullname: string;
  avatarUrl: string | null;
  assigned: number;
  completed: number;
  notStarted: number;
  overdue: number;
};

export type LearningSnapshot = {
  employees: number;
  enrolledEmployees: number;
  assignments: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  courses: LearningCourseReport[];
  attention: LearningEmployeeReport[];
};

export type LearningActivity = {
  activeLearners: number;
  lessonsCompleted: number;
  submissions: number;
  daily: Array<{ date: string; lessons: number; submissions: number }>;
};

function learningPopulation(orgId: string, requiredOnly = false) {
  const access = learningMembershipSql(sql`ac.id`, sql`ac.group_id`, sql`candidate.profile_id`);
  const required = requiredOnly ? courseRequiredSql(sql`ac.id`, sql`candidate.profile_id`) : sql`true`;
  return sql`
    active_courses AS (
      SELECT c.id, c.title, c.type, c.is_published, c.group_id
      FROM course c JOIN "group" g ON g.id = c.group_id
      WHERE g.organization_id = ${orgId} AND c.status = 'ACTIVE' AND c.is_template = false
    ),
    employees AS (
      SELECT p.id AS profile_id, COALESCE(p.fullname, p.username, '') AS fullname, p.avatar_url
      FROM organizationmember om JOIN profile p ON p.id = om.profile_id
      WHERE om.organization_id = ${orgId} AND om.role_id = 3 AND om.status = 'ACTIVE'
        AND NOT EXISTS (SELECT 1 FROM employee e WHERE e.member_id = om.id AND e.status <> 'ACTIVE')
    ),
    candidates AS (
      select ac.id course_id, gm.profile_id from active_courses ac join groupmember gm on gm.group_id = ac.group_id where gm.role_id = 3
      union
      select ac.id, pm.profile_id from active_courses ac join program_course pc on pc.course_id = ac.id
        join program p on p.id = pc.program_id join program_member pm on pm.program_id = p.id
        where p.status = 'ACTIVE' and pm.role_id = 3
      union
      select ac.id, cm.profile_id from active_courses ac join cohort_course cc on cc.course_id = ac.id
        join cohort c on c.id = cc.cohort_id join cohort_member cm on cm.cohort_id = c.id
        where c.status = 'ACTIVE' and cm.role_id = 3
    ),
    enrollments AS (
      SELECT gm.id AS member_id, candidate.profile_id, ac.id AS course_id, ac.type,
        md5(candidate.course_id::text || candidate.profile_id::text) participation_id
      FROM candidates candidate
      JOIN active_courses ac ON ac.id = candidate.course_id
      JOIN employees emp ON emp.profile_id = candidate.profile_id
      LEFT JOIN groupmember gm ON gm.group_id = ac.group_id AND gm.profile_id = candidate.profile_id
      WHERE (gm.role_id = 3 OR gm.id IS NULL) AND ${access} AND ${required}
    )
  `;
}

export async function getLearningAnalyticsSnapshot(orgId: string, dbClient: DbOrTxClient = db) {
  const assigned = courseAssignedSql(sql`ac.id`, sql`candidate.profile_id`);
  const access = learningMembershipSql(sql`ac.id`, sql`ac.group_id`, sql`candidate.profile_id`);
  const deadline = courseDeadlineSql(sql`en.course_id`, sql`en.profile_id`);
  const completionPolicy = submissionMeetsCompletionPolicySql('exercise', 'submission');
  const population = learningPopulation(orgId, true);
  const rows = await dbClient.execute<LearningSnapshot>(sql`
    WITH ${population},
    course_exercises AS (
      SELECT ac.id AS course_id, ex.id AS exercise_id
      FROM active_courses ac
      JOIN exercise ex ON ex.course_id = ac.id OR EXISTS (
        SELECT 1 FROM lesson el WHERE el.id = ex.lesson_id AND el.course_id = ac.id
      )
    ),
    lesson_totals AS (
      SELECT l.course_id, COUNT(*)::int AS total FROM lesson l
      JOIN active_courses ac ON ac.id = l.course_id GROUP BY l.course_id
    ),
    exercise_totals AS (
      SELECT course_id, COUNT(*)::int AS total FROM course_exercises GROUP BY course_id
    ),
    lesson_progress AS (
      SELECT en.participation_id, COUNT(DISTINCT lc.lesson_id)::int AS completed
      FROM enrollments en JOIN lesson l ON l.course_id = en.course_id
      JOIN lesson_completion lc ON lc.lesson_id = l.id AND lc.profile_id = en.profile_id AND lc.is_complete = true
      GROUP BY en.participation_id
    ),
    exercise_progress AS (
      SELECT en.participation_id, COUNT(DISTINCT exercise.id)::int AS completed
      FROM enrollments en JOIN submission ON submission.submitted_by = en.member_id
      JOIN exercise ON exercise.id = submission.exercise_id
      JOIN course_exercises ce ON ce.exercise_id = exercise.id AND ce.course_id = en.course_id
      WHERE ${completionPolicy} GROUP BY en.participation_id
    ),
    progress AS (
      SELECT en.*, COALESCE(lt.total, 0) + COALESCE(et.total, 0) AS total_items,
        COALESCE(lp.completed, 0) + COALESCE(ep.completed, 0) AS completed_items,
        cr.status AS compliance_status, ${deadline} AS due_date
      FROM enrollments en
      LEFT JOIN lesson_totals lt ON lt.course_id = en.course_id
      LEFT JOIN exercise_totals et ON et.course_id = en.course_id
      LEFT JOIN lesson_progress lp ON lp.participation_id = en.participation_id
      LEFT JOIN exercise_progress ep ON ep.participation_id = en.participation_id
      LEFT JOIN LATERAL (
        SELECT status, due_date FROM course_completion_record
        WHERE course_id = en.course_id AND profile_id = en.profile_id
        ORDER BY cycle_number DESC LIMIT 1
      ) cr ON en.type = 'COMPLIANCE'
    ),
    completion AS (
      SELECT progress.*, CASE WHEN type = 'COMPLIANCE'
        THEN COALESCE(compliance_status IN ('compliant', 'waived'), false)
        ELSE total_items > 0 AND completed_items >= total_items END AS is_complete
      FROM progress
    ),
    learning_state AS (
      SELECT completion.*, CASE WHEN is_complete THEN 'completed'
        WHEN completed_items > 0 THEN 'in_progress' ELSE 'not_started' END AS state,
        NOT is_complete
          AND (COALESCE(due_date < now(), false) OR COALESCE(compliance_status = 'non_compliant', false)) AS is_overdue
      FROM completion
    ),
    course_metrics AS (
      SELECT ac.id, ac.title, ac.type, ac.is_published AS "isPublished", COUNT(ls.course_id)::int AS assigned,
        COUNT(*) FILTER (WHERE ls.state = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE ls.state = 'in_progress')::int AS "inProgress",
        COUNT(*) FILTER (WHERE ls.state = 'not_started')::int AS "notStarted",
        COUNT(*) FILTER (WHERE ls.is_overdue)::int AS overdue,
        ROUND(AVG(CASE WHEN ls.total_items > 0 THEN LEAST(100, ls.completed_items * 100.0 / ls.total_items)
          WHEN ls.member_id IS NOT NULL THEN 0 END))::int AS progress
      FROM active_courses ac LEFT JOIN learning_state ls ON ls.course_id = ac.id
      GROUP BY ac.id, ac.title, ac.type, ac.is_published
    ),
    employee_metrics AS (
      SELECT emp.profile_id AS id, emp.fullname, emp.avatar_url AS "avatarUrl", COUNT(ls.course_id)::int AS assigned,
        COUNT(*) FILTER (WHERE ls.state = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE ls.state = 'not_started')::int AS "notStarted",
        COUNT(*) FILTER (WHERE ls.is_overdue)::int AS overdue
      FROM employees emp LEFT JOIN learning_state ls ON ls.profile_id = emp.profile_id
      GROUP BY emp.profile_id, emp.fullname, emp.avatar_url
    )
    SELECT (SELECT COUNT(*)::int FROM employees) AS employees,
      (SELECT COUNT(DISTINCT candidate.profile_id)::int FROM candidates candidate
        JOIN active_courses ac ON ac.id = candidate.course_id
        JOIN employees emp ON emp.profile_id = candidate.profile_id
        WHERE ${access} AND ${assigned}) AS "enrolledEmployees",
      COUNT(*)::int AS assignments,
      COUNT(*) FILTER (WHERE state = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE state = 'in_progress')::int AS "inProgress",
      COUNT(*) FILTER (WHERE state = 'not_started')::int AS "notStarted",
      COUNT(*) FILTER (WHERE is_overdue)::int AS overdue,
      COALESCE((SELECT json_agg(cm ORDER BY cm.overdue DESC, cm.assigned DESC, cm.title, cm.id) FROM course_metrics cm), '[]'::json) AS courses,
      COALESCE((SELECT json_agg(attention) FROM (
        SELECT * FROM employee_metrics WHERE assigned = 0 OR "notStarted" > 0 OR overdue > 0
        ORDER BY overdue DESC, (assigned = 0) DESC, "notStarted" DESC, fullname, id LIMIT 5
      ) attention), '[]'::json) AS attention
    FROM learning_state
  `);
  const snapshot = rows[0];
  if (!snapshot) throw new Error('Learning snapshot unavailable');

  return snapshot;
}

export async function getLearningAnalyticsActivity(orgId: string, days: number, dbClient: DbOrTxClient = db) {
  const population = learningPopulation(orgId);
  const rows = await dbClient.execute<LearningActivity>(sql`
    WITH ${population},
    boundaries AS (
      SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS today,
        (((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - (${days}::int - 1))::timestamp
          AT TIME ZONE 'Asia/Ho_Chi_Minh') AS since
    ),
    events AS (
      SELECT en.profile_id, COALESCE(lc.updated_at, lc.created_at) AS happened_at, 'lesson' AS kind
      FROM enrollments en JOIN lesson l ON l.course_id = en.course_id
      JOIN lesson_completion lc ON lc.lesson_id = l.id AND lc.profile_id = en.profile_id AND lc.is_complete = true
      CROSS JOIN boundaries b
      WHERE COALESCE(lc.updated_at, lc.created_at) >= b.since AND COALESCE(lc.updated_at, lc.created_at) <= now()
      UNION ALL
      SELECT en.profile_id, s.created_at AS happened_at, 'submission' AS kind
      FROM enrollments en JOIN submission s ON s.submitted_by = en.member_id
      JOIN exercise ex ON ex.id = s.exercise_id
      LEFT JOIN lesson l ON l.id = ex.lesson_id
      CROSS JOIN boundaries b
      WHERE (ex.course_id = en.course_id OR l.course_id = en.course_id)
        AND s.created_at >= b.since AND s.created_at <= now()
    ),
    daily AS (
      SELECT to_char(b.today - (${days}::int - 1) + day_index, 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE ev.kind = 'lesson')::int AS lessons,
        COUNT(*) FILTER (WHERE ev.kind = 'submission')::int AS submissions
      FROM boundaries b CROSS JOIN generate_series(0, ${days}::int - 1) AS day_index
      LEFT JOIN events ev ON (ev.happened_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = b.today - (${days}::int - 1) + day_index
      GROUP BY b.today, day_index
    )
    SELECT COUNT(DISTINCT profile_id)::int AS "activeLearners",
      COUNT(*) FILTER (WHERE kind = 'lesson')::int AS "lessonsCompleted",
      COUNT(*) FILTER (WHERE kind = 'submission')::int AS submissions,
      COALESCE((SELECT json_agg(daily ORDER BY date) FROM daily), '[]'::json) AS daily
    FROM events
  `);
  const activity = rows[0];
  if (!activity) throw new Error('Learning activity unavailable');

  return activity;
}

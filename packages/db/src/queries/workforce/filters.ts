import { sql, type SQL, type SQLWrapper } from 'drizzle-orm';

export function workforceMemberFilter(profileId: SQLWrapper, filters: { unitId?: string; jobTitleId?: string }): SQL {
  if (!filters.unitId && !filters.jobTitleId) return sql`true`;

  const unit = filters.unitId ? sql`employee.unit_id = ${filters.unitId}` : sql`true`;
  const title = filters.jobTitleId ? sql`employee.job_title_id = ${filters.jobTitleId}` : sql`true`;
  return sql`exists (select 1 from workforce_employee employee where employee.profile_id = ${profileId} and ${unit} and ${title})`;
}

export function workforceMemberSearch(profileId: SQLWrapper, search: string): SQL {
  const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
  return sql`exists (select 1 from workforce_employee employee
    left join workforce_unit unit on unit.id = employee.unit_id
    left join workforce_job_title title on title.id = employee.job_title_id
    where employee.profile_id = ${profileId} and (employee.employee_code ilike ${pattern} or unit.name ilike ${pattern} or title.name ilike ${pattern}))`;
}

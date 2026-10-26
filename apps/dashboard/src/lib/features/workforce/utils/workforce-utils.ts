import Papa from 'papaparse';
import { ZCreateEmployee } from '@cio/utils/validation/organization';
import type { EmployeeDraft, ImportPreviewRow, WorkforceOverview } from './types';

export function createEmployeeDraft(): EmployeeDraft {
  return {
    id: '',
    employeeCode: '',
    fullname: '',
    email: '',
    unitId: '',
    jobTitleId: '',
    managerId: '',
    accessRole: 'EMPLOYEE',
    sendActivation: true,
    reason: ''
  };
}

export function parseWorkforceImport(
  csv: string,
  overview: WorkforceOverview,
  sendActivation: boolean
): ImportPreviewRow[] {
  const parsed = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim()
  });
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  return parsed.data.slice(0, 1001).map((row, index) => {
    const employeeCode = row.employeeCode?.trim().toUpperCase() ?? '';
    const email = row.email?.trim().toLowerCase() ?? '';
    const unit = overview.units.find((entry) => entry.code === row.unitCode?.trim().toUpperCase());
    const title = overview.jobTitles.find((entry) => entry.code === row.jobTitleCode?.trim().toUpperCase());
    const manager = overview.people.find((entry) => entry.employeeCode === row.managerCode?.trim().toUpperCase());
    const values = {
      employeeCode,
      email,
      fullname: row.fullname?.trim() ?? '',
      unitId: unit?.id ?? null,
      jobTitleId: title?.id ?? null,
      managerId: manager?.id ?? null,
      accessRole: 'EMPLOYEE',
      sendActivation
    };
    const validation = ZCreateEmployee.safeParse(values);
    const duplicate =
      seenCodes.has(employeeCode) ||
      seenEmails.has(email) ||
      overview.people.some((employee) => employee.employeeCode === employeeCode || employee.email === email);
    seenCodes.add(employeeCode);
    seenEmails.add(email);
    const invalidRelation =
      (!!row.unitCode && !unit) || (!!row.jobTitleCode && !title) || (!!row.managerCode && !manager);
    const parseError = parsed.errors.some((error) => error.row === index);
    const error =
      index >= 1000
        ? 'workforce.errors.import_limit'
        : duplicate
          ? 'workforce.errors.duplicate'
          : invalidRelation
            ? 'workforce.errors.import_relation'
            : !validation.success || parseError
              ? 'workforce.errors.import_row'
              : null;
    return { row: index + 2, data: error || !validation.success ? null : validation.data, employeeCode, error };
  });
}

export function workforceCsvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

export function workforceErrorKey(error: string | null) {
  if (!error) return '';
  if (error.startsWith('workforce.')) return error;

  try {
    const parsed = JSON.parse(error) as { error?: string; code?: string };
    if (parsed.error?.startsWith('workforce.')) return parsed.error;
    if (parsed.code === 'CONFLICT') return 'workforce.errors.duplicate';
  } catch {
    return 'workforce.errors.form';
  }
  return 'workforce.errors.request_failed';
}

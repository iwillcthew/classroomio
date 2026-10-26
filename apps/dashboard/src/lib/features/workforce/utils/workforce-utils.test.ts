import { describe, expect, it } from 'vitest';
import { parseWorkforceImport, workforceCsvCell } from './workforce-utils';
import type { WorkforceOverview } from './types';

const overview = {
  units: [{ id: '11111111-1111-4111-8111-111111111111', code: 'SALES', name: 'Sales' }],
  jobTitles: [{ id: '22222222-2222-4222-8222-222222222222', code: 'SPECIALIST', name: 'Specialist' }],
  people: [
    { id: '33333333-3333-4333-8333-333333333333', employeeCode: 'NV-HEAD', email: 'head@example.com', fullname: 'Head' }
  ]
} as WorkforceOverview;

describe('workforce CSV import', () => {
  it('preserves quoted names and resolves organizational codes', () => {
    const csv =
      'employeeCode,fullname,email,unitCode,jobTitleCode,managerCode\nnv-001,"Nguyen, An",an@example.com,SALES,SPECIALIST,NV-HEAD';
    const [row] = parseWorkforceImport(csv, overview, true);
    expect(row.error).toBeNull();
    expect(row.data).toMatchObject({
      employeeCode: 'NV-001',
      fullname: 'Nguyen, An',
      unitId: overview.units[0].id,
      jobTitleId: overview.jobTitles[0].id,
      managerId: overview.people[0].id,
      sendActivation: true
    });
  });

  it('rejects duplicate codes regardless of casing and duplicates already in the roster', () => {
    const csv =
      'employeeCode,fullname,email\nNV-001,First learner,first@example.com\nnv-001,Second learner,second@example.com\nNV-HEAD,Head,third@example.com';
    const rows = parseWorkforceImport(csv, overview, false);
    expect(rows.map((row) => row.error)).toEqual([null, 'workforce.errors.duplicate', 'workforce.errors.duplicate']);
  });

  it('does not silently discard an unknown unit or manager', () => {
    const csv =
      'employeeCode,fullname,email,unitCode,managerCode\nNV-001,First learner,first@example.com,UNKNOWN,NV-MISSING';
    const [row] = parseWorkforceImport(csv, overview, false);
    expect(row.error).toBe('workforce.errors.import_relation');
    expect(row.data).toBeNull();
  });

  it('prevents spreadsheet formulas from executing in exported CSV cells', () => {
    expect(workforceCsvCell('=HYPERLINK("https://example.com")')).toBe('"\'=HYPERLINK(""https://example.com"")"');
    expect(workforceCsvCell('Unit A')).toBe('"Unit A"');
  });
});

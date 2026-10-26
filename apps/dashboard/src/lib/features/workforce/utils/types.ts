import { classroomio, type InferResponseType } from '$lib/utils/services/api';
import type { TCreateEmployee, TWorkforceFilters } from '@cio/utils/validation/organization';

export type WorkforceRequest = typeof classroomio.workforce.$get;
export type WorkforceProfilesRequest = typeof classroomio.workforce.profiles.$get;
export type PersonnelScopeFilters = { search: string; unitId?: string; jobTitleId?: string; courseId?: string };
export type WorkforceOverview = Extract<InferResponseType<WorkforceRequest>, { success: true }>['data'];
export type EmployeeRow = WorkforceOverview['employees']['rows'][number];
export type WorkforceReportRequest = typeof classroomio.workforce.reports.$get;
export type WorkforceReport = Extract<InferResponseType<WorkforceReportRequest>, { success: true }>['data'];
export type WorkforceAssignmentsRequest = typeof classroomio.workforce.assignments.$get;
export type WorkforceAssignments = Extract<InferResponseType<WorkforceAssignmentsRequest>, { success: true }>['data'];
export type EmployeeHistoryRequest = (typeof classroomio.workforce.employees)[':employeeId']['history']['$get'];
export type EmployeeHistory = Extract<InferResponseType<EmployeeHistoryRequest>, { success: true }>['data'];
export type EmployeeDraft = Omit<TCreateEmployee, 'unitId' | 'jobTitleId' | 'managerId'> & {
  id: string;
  reason: string;
  unitId: string;
  jobTitleId: string;
  managerId: string;
};
export type WorkforceFilterDraft = Pick<TWorkforceFilters, 'search' | 'page' | 'limit'> & {
  unitId: string;
  jobTitleId: string;
  status: string;
};
export type WorkforceTab = 'employees' | 'directory' | 'training' | 'reports' | 'my-training';
export type ImportPreviewRow = {
  row: number;
  data: TCreateEmployee | null;
  employeeCode: string;
  error: string | null;
};
export type ImportResult = { employeeCode: string; success: boolean; error: string | null; activationQueued: boolean };
export type ActivationPreviewRequest = typeof classroomio.workforce.activation.$get;
export type ActivationPreview = Extract<InferResponseType<ActivationPreviewRequest>, { success: true }>['data'];
export type WorkforceFilterOptionsRequest = (typeof classroomio.workforce)['filter-options']['$get'];
export type WorkforceFilterOptions = Extract<
  InferResponseType<WorkforceFilterOptionsRequest>,
  { success: true }
>['data'];

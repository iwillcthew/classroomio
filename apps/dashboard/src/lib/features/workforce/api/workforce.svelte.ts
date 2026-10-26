import { BaseApi, classroomio } from '$lib/utils/services/api';
import { currentOrg } from '$lib/utils/store/org';
import { get } from 'svelte/store';
import {
  ZCreateEmployee,
  ZJobTitle,
  ZLearningPath,
  ZTrainingRule,
  ZUpdateEmployee,
  ZWorkforceUnit
} from '@cio/utils/validation/organization';
import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
import {
  createEmployeeDraft,
  parseWorkforceImport,
  workforceCsvCell,
  workforceErrorKey
} from '../utils/workforce-utils';
import type {
  EmployeeDraft,
  EmployeeHistory,
  EmployeeHistoryRequest,
  EmployeeRow,
  ImportPreviewRow,
  ImportResult,
  WorkforceAssignments,
  WorkforceAssignmentsRequest,
  WorkforceFilterDraft,
  WorkforceOverview,
  WorkforceReport,
  WorkforceReportRequest,
  WorkforceRequest,
  WorkforceTab
} from '../utils/types';

export class WorkforceApi extends BaseApi {
  overview = $state<WorkforceOverview | null>(null);
  report = $state<WorkforceReport | null>(null);
  assignments = $state<WorkforceAssignments | null>(null);
  history = $state<EmployeeHistory | null>(null);
  historyEmployee = $state('');
  tab = $state<WorkforceTab>('employees');
  filters = $state<WorkforceFilterDraft>({ search: '', unitId: '', jobTitleId: '', status: '', page: 1, limit: 25 });
  employeeDraft = $state<EmployeeDraft>(createEmployeeDraft());
  employeeOpen = $state(false);
  unitDraft = $state({ id: '', code: '', name: '', leaderId: '' });
  titleDraft = $state({ id: '', code: '', name: '' });
  ruleDraft = $state({
    id: '',
    name: '',
    unitId: '',
    jobTitleId: '',
    courseIds: [] as string[],
    examIds: [] as string[],
    pathIds: [] as string[],
    enabled: true
  });
  pathDraft = $state({ id: '', name: '', jobTitleId: '', courseIds: [] as string[] });
  importCsv = $state('');
  importSendActivation = $state(true);
  importRows = $state<ImportPreviewRow[]>([]);
  importResults = $state<ImportResult[] | null>(null);
  notice = $state('');
  search = new DebouncedSearch({
    onApply: (search) => {
      this.filters.search = search;
      void this.applyFilters();
    }
  });
  #loadId = 0;

  get errorKey() {
    return workforceErrorKey(this.error);
  }

  async load() {
    const organizationId = get(currentOrg).id;
    if (!organizationId) return;

    const loadId = ++this.#loadId;
    const query = {
      search: this.filters.search,
      page: String(this.filters.page),
      limit: String(this.filters.limit),
      ...(this.filters.unitId ? { unitId: this.filters.unitId } : {}),
      ...(this.filters.jobTitleId ? { jobTitleId: this.filters.jobTitleId } : {}),
      ...(this.filters.status ? { status: this.filters.status as 'ACTIVE' } : {})
    };
    await this.execute<WorkforceRequest>({
      requestFn: () => classroomio.workforce.$get({ query }),
      onSuccess: (result) => {
        if (loadId !== this.#loadId) return;

        this.overview = result.data;
        if (!result.data.actor.canManage && !result.data.actor.unitIds.length && !result.data.actor.reportIds.length)
          this.tab = 'my-training';
      }
    });
  }

  async applyFilters() {
    this.filters.page = 1;
    await this.load();
    if (this.tab === 'reports') await this.loadReport();
  }

  async selectTab(tab: WorkforceTab) {
    this.tab = tab;
    if (tab === 'reports') await this.loadReport();
    if (tab === 'my-training') await this.loadAssignments();
  }

  async changePage(offset: number) {
    this.filters.page = Math.max(1, this.filters.page + offset);
    await this.load();
  }

  openEmployee(row?: EmployeeRow) {
    Object.assign(this.employeeDraft, createEmployeeDraft());
    if (row)
      Object.assign(this.employeeDraft, row.employee, {
        fullname: row.fullname,
        email: row.email ?? '',
        unitId: row.employee.unitId ?? '',
        jobTitleId: row.employee.jobTitleId ?? '',
        managerId: row.employee.managerId ?? '',
        reason: '',
        sendActivation: false
      });

    this.employeeOpen = true;
    this.error = null;
  }

  async saveEmployee(sendActivation: boolean) {
    const draft = this.employeeDraft;
    const relations = {
      unitId: draft.unitId || null,
      jobTitleId: draft.jobTitleId || null,
      managerId: draft.managerId || null
    };
    if (draft.id) {
      const parsed = ZUpdateEmployee.safeParse({
        ...relations,
        fullname: draft.fullname,
        accessRole: draft.accessRole,
        reason: draft.reason
      });
      if (!parsed.success) {
        this.error = 'workforce.errors.form';
        return;
      }

      const endpoint = classroomio.workforce.employees[':employeeId'];
      await this.execute<typeof endpoint.$patch>({
        requestFn: () => endpoint.$patch({ param: { employeeId: draft.id }, json: parsed.data }),
        onSuccess: () => {
          this.employeeOpen = false;
        }
      });
    } else {
      const parsed = ZCreateEmployee.safeParse({
        ...relations,
        fullname: draft.fullname,
        email: draft.email,
        employeeCode: draft.employeeCode,
        accessRole: draft.accessRole,
        sendActivation
      });
      if (!parsed.success) {
        this.error = 'workforce.errors.form';
        return;
      }

      await this.execute<typeof classroomio.workforce.employees.$post>({
        requestFn: () => classroomio.workforce.employees.$post({ json: parsed.data }),
        onSuccess: (result) => {
          this.employeeOpen = false;
          const needsActivation = sendActivation && !result.data.employee.activatedAt;
          this.notice =
            needsActivation && !result.data.activation.queued ? 'workforce.activation_not_queued' : 'workforce.saved';
        }
      });
    }
    if (this.success) await this.load();
  }

  async setStatus(row: EmployeeRow, status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED', reason: string) {
    if (!reason.trim()) {
      this.error = 'workforce.errors.reason';
      return;
    }

    const endpoint = classroomio.workforce.employees[':employeeId'];
    await this.execute<typeof endpoint.$patch>({
      requestFn: () => endpoint.$patch({ param: { employeeId: row.employee.id }, json: { status, reason } })
    });
    if (this.success) await this.load();
  }

  async sendActivation(employeeId: string) {
    const endpoint = classroomio.workforce.employees[':employeeId'].activation;
    await this.execute<typeof endpoint.$post>({
      requestFn: () => endpoint.$post({ param: { employeeId } }),
      onSuccess: (result) => {
        this.notice = result.data.queued ? 'workforce.activation_queued' : 'workforce.activation_not_queued';
      }
    });
    if (this.success) await this.load();
  }

  async showHistory(row: EmployeeRow) {
    this.historyEmployee = row.fullname;
    this.history = null;
    const endpoint = classroomio.workforce.employees[':employeeId'].history;
    await this.execute<EmployeeHistoryRequest>({
      requestFn: () => endpoint.$get({ param: { employeeId: row.employee.id } }),
      onSuccess: (result) => {
        this.history = result.data;
      }
    });
  }

  async saveUnit() {
    const parsed = ZWorkforceUnit.safeParse({
      code: this.unitDraft.code,
      name: this.unitDraft.name,
      leaderId: this.unitDraft.leaderId
    });
    if (!parsed.success) {
      this.error = 'workforce.errors.form';
      return;
    }

    const resourceId = this.unitDraft.id;
    if (resourceId) {
      const endpoint = classroomio.workforce.units[':resourceId'];
      await this.execute<typeof endpoint.$put>({
        requestFn: () => endpoint.$put({ param: { resourceId }, json: parsed.data })
      });
    } else {
      await this.execute<typeof classroomio.workforce.units.$post>({
        requestFn: () => classroomio.workforce.units.$post({ json: parsed.data })
      });
    }
    if (this.success) {
      Object.assign(this.unitDraft, { id: '', code: '', name: '', leaderId: '' });
      await this.load();
    }
  }

  async saveTitle() {
    const parsed = ZJobTitle.safeParse({ code: this.titleDraft.code, name: this.titleDraft.name });
    if (!parsed.success) {
      this.error = 'workforce.errors.form';
      return;
    }

    const resourceId = this.titleDraft.id;
    if (resourceId) {
      const endpoint = classroomio.workforce['job-titles'][':resourceId'];
      await this.execute<typeof endpoint.$put>({
        requestFn: () => endpoint.$put({ param: { resourceId }, json: parsed.data })
      });
    } else {
      await this.execute<(typeof classroomio.workforce)['job-titles']['$post']>({
        requestFn: () => classroomio.workforce['job-titles'].$post({ json: parsed.data })
      });
    }
    if (this.success) {
      Object.assign(this.titleDraft, { id: '', code: '', name: '' });
      await this.load();
    }
  }

  async saveRule() {
    const draft = this.ruleDraft;
    const parsed = ZTrainingRule.safeParse({
      name: draft.name,
      unitId: draft.unitId || null,
      jobTitleId: draft.jobTitleId || null,
      courseIds: draft.courseIds,
      examIds: draft.examIds,
      pathIds: draft.pathIds,
      enabled: draft.enabled
    });
    if (!parsed.success) {
      this.error = 'workforce.errors.form';
      return;
    }

    if (draft.id) {
      const endpoint = classroomio.workforce.rules[':resourceId'];
      await this.execute<typeof endpoint.$put>({
        requestFn: () => endpoint.$put({ param: { resourceId: draft.id }, json: parsed.data })
      });
    } else {
      await this.execute<typeof classroomio.workforce.rules.$post>({
        requestFn: () => classroomio.workforce.rules.$post({ json: parsed.data })
      });
    }
    if (this.success) {
      Object.assign(draft, {
        id: '',
        name: '',
        unitId: '',
        jobTitleId: '',
        courseIds: [],
        examIds: [],
        pathIds: [],
        enabled: true
      });
      await this.load();
    }
  }

  editRule(ruleId: string) {
    const rule = this.overview?.rules.find((entry) => entry.id === ruleId);
    if (!rule) return;

    const targets = this.overview!.targets.filter((target) => target.ruleId === ruleId);
    const courseIds = targets.flatMap((target) => (target.courseId ? [target.courseId] : []));
    const examIds = targets.flatMap((target) => (target.examId ? [target.examId] : []));
    const pathIds = targets.flatMap((target) => (target.pathId ? [target.pathId] : []));
    Object.assign(this.ruleDraft, rule, {
      unitId: rule.unitId ?? '',
      jobTitleId: rule.jobTitleId ?? '',
      courseIds,
      examIds,
      pathIds
    });
  }

  async savePath() {
    const draft = this.pathDraft;
    const parsed = ZLearningPath.safeParse({
      name: draft.name,
      jobTitleId: draft.jobTitleId,
      courseIds: draft.courseIds
    });
    if (!parsed.success) {
      this.error = 'workforce.errors.form';
      return;
    }

    if (draft.id) {
      const endpoint = classroomio.workforce.paths[':resourceId'];
      await this.execute<typeof endpoint.$put>({
        requestFn: () => endpoint.$put({ param: { resourceId: draft.id }, json: parsed.data })
      });
    } else {
      await this.execute<typeof classroomio.workforce.paths.$post>({
        requestFn: () => classroomio.workforce.paths.$post({ json: parsed.data })
      });
    }
    if (this.success) {
      Object.assign(draft, { id: '', name: '', jobTitleId: '', courseIds: [] });
      await this.load();
    }
  }

  editPath(pathId: string) {
    const path = this.overview?.paths.find((entry) => entry.id === pathId);
    if (!path) return;

    const courseIds = this.overview!.pathCourses.filter((entry) => entry.pathId === pathId).map(
      (entry) => entry.courseId
    );
    Object.assign(this.pathDraft, path, { courseIds });
  }

  reviewImport() {
    if (!this.overview) return;

    this.importRows = parseWorkforceImport(this.importCsv, this.overview, this.importSendActivation);
    this.importResults = null;
  }

  async readImportFile(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.csv')) {
      this.error = 'workforce.errors.import_file';
      return;
    }

    this.importCsv = await file.text();
    this.reviewImport();
  }

  async importEmployees() {
    this.reviewImport();
    const employees = this.importRows.flatMap((row) => (row.data ? [row.data] : []));
    if (!employees.length || this.importRows.length > 1000) {
      this.error = 'workforce.errors.import_limit';
      return;
    }

    await this.execute<typeof classroomio.workforce.import.$post>({
      requestFn: () => classroomio.workforce.import.$post({ json: { employees } }),
      onSuccess: (result) => {
        this.importResults = result.data;
      }
    });
    if (this.success) await this.load();
  }

  async loadReport() {
    const query = {
      search: this.filters.search,
      ...(this.filters.unitId ? { unitId: this.filters.unitId } : {}),
      ...(this.filters.jobTitleId ? { jobTitleId: this.filters.jobTitleId } : {})
    };
    await this.execute<WorkforceReportRequest>({
      requestFn: () => classroomio.workforce.reports.$get({ query }),
      onSuccess: (result) => {
        this.report = result.data;
      }
    });
  }

  activationWasNotQueued(result: ImportResult) {
    const alreadyActive = this.overview?.people.some(
      (employee) => employee.employeeCode === result.employeeCode && !!employee.activatedAt
    );
    return result.success && this.importSendActivation && !result.activationQueued && !alreadyActive;
  }

  async loadAssignments() {
    await this.execute<WorkforceAssignmentsRequest>({
      requestFn: () => classroomio.workforce.assignments.$get(),
      onSuccess: (result) => {
        this.assignments = result.data;
      }
    });
  }

  downloadCsv(kind: 'report' | 'template') {
    const header =
      kind === 'template'
        ? ['employeeCode', 'fullname', 'email', 'unitCode', 'jobTitleCode', 'managerCode']
        : ['unit', 'employees', 'assigned', 'completed', 'remaining', 'completionRate'];
    const rows =
      kind === 'template'
        ? []
        : (this.report ?? []).map((row) => [
            row.unit,
            row.employees,
            row.assigned,
            row.completed,
            row.remaining,
            row.completionRate
          ]);
    const csvRows = [header, ...rows].map((row) => row.map(workforceCsvCell).join(','));
    const csv = '\uFEFF' + csvRows.join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = kind === 'template' ? 'employees-template.csv' : 'unit-training-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}

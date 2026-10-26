import { BaseApi, classroomio } from '$lib/utils/services/api';
import type {
  AnalyticsRange,
  LearningAnalyticsRequest,
  LearningReport,
  LearningPersonnelFilters
} from '../utils/types';
import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';

export class LearningAnalyticsApi extends BaseApi {
  report = $state<LearningReport | null>(null);
  range = $state<AnalyticsRange>(30);
  loading = $state(true);
  failed = $state(false);
  personnelFilters = $state<LearningPersonnelFilters>({});
  search = new DebouncedSearch({
    onApply: (search) => {
      this.personnelFilters.search = search || undefined;
      void this.load();
    }
  });
  #controller: AbortController | null = null;
  #organizationId = '';

  ensureOrganization(orgId: string) {
    if (!orgId || this.#organizationId === orgId) return;

    this.#organizationId = orgId;
    this.report = null;
    void this.load();
  }

  async load(days: AnalyticsRange = this.range) {
    this.#controller?.abort();
    const controller = new AbortController();
    this.#controller = controller;
    this.range = days;
    this.loading = true;
    this.failed = false;
    const query = { days: String(days), ...this.personnelFilters };
    const options = { init: { signal: controller.signal } };
    const result = await this.execute<LearningAnalyticsRequest>({
      requestFn: () => classroomio.dash['learning-analytics'].$get({ query }, options),
      logContext: 'loading internal training analytics',
      onSuccess: (response) => {
        if (controller.signal.aborted) return;

        this.report = response.data;
      }
    });
    if (controller.signal.aborted) return;

    this.failed = !result;
    this.loading = false;
  }

  cancel() {
    this.#controller?.abort();
    this.search.destroy();
  }

  async filterPersonnel(patch: LearningPersonnelFilters) {
    Object.assign(this.personnelFilters, patch);
    await this.load();
  }
}

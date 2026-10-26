import { BaseApi, classroomio } from '$lib/utils/services/api';
import type { WorkforceFilterOptions, WorkforceFilterOptionsRequest } from '../utils/types';

export class WorkforceFilterOptionsApi extends BaseApi {
  options = $state<WorkforceFilterOptions | null>(null);
  async load() {
    await this.execute<WorkforceFilterOptionsRequest>({
      requestFn: () => classroomio.workforce['filter-options'].$get(),
      onSuccess: (result) => {
        this.options = result.data;
      }
    });
  }
}

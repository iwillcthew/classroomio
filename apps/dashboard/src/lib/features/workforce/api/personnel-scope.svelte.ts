import { BaseApi, classroomio } from '$lib/utils/services/api';
import type { PersonnelScopeFilters, WorkforceProfilesRequest } from '../utils/types';

export class PersonnelScopeApi extends BaseApi {
  #requestSequence = 0;

  async load(filters: PersonnelScopeFilters, onScopeChange: (profileIds: string[] | null) => void) {
    const requestSequence = ++this.#requestSequence;
    if (!filters.search && !filters.unitId && !filters.jobTitleId) {
      onScopeChange(null);
      return;
    }

    onScopeChange([]);
    await this.execute<WorkforceProfilesRequest>({
      requestFn: () => classroomio.workforce.profiles.$get({ query: filters }),
      onSuccess: (result) => {
        if (requestSequence === this.#requestSequence) onScopeChange(result.data);
      }
    });
  }
}

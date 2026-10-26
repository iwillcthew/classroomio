<script lang="ts">
  import { InputField } from '@cio/ui/custom/input-field';
  import { t } from '$lib/utils/functions/translations';
  import WorkforceSelect from './workforce-select.svelte';
  import type { WorkforceApi } from '../api/workforce.svelte';
  let { api, showStatus = false }: { api: WorkforceApi; showStatus?: boolean } = $props();
  const units = $derived((api.overview?.units ?? []).map((unit) => ({ value: unit.id, label: unit.name })));
  const titles = $derived((api.overview?.jobTitles ?? []).map((title) => ({ value: title.id, label: title.name })));
  const statuses = $derived(
    ['DRAFT', 'PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED'].map((status) => ({
      value: status,
      label: $t(`workforce.status.${status}`)
    }))
  );
</script>

<div class="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
  <InputField
    label={$t('workforce.search')}
    bind:value={api.search.draft}
    onInput={() => api.search.input(api.search.draft)}
    placeholder={$t('workforce.search_hint')}
  />
  <WorkforceSelect
    label={$t('workforce.unit')}
    bind:value={api.filters.unitId}
    options={units}
    onchange={() => api.applyFilters()}
  />
  <WorkforceSelect
    label={$t('workforce.job_title')}
    bind:value={api.filters.jobTitleId}
    options={titles}
    onchange={() => api.applyFilters()}
  />
  {#if showStatus}<WorkforceSelect
      label={$t('workforce.account_status')}
      bind:value={api.filters.status}
      options={statuses}
      onchange={() => api.applyFilters()}
    />{/if}
</div>

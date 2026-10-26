<script lang="ts">
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { WorkforceFilterOptionsApi } from '../api/filter-options.svelte';
  import WorkforceSelect from './workforce-select.svelte';
  let {
    unitId,
    jobTitleId,
    onFilterChange
  }: {
    unitId?: string;
    jobTitleId?: string;
    onFilterChange: (patch: { unitId?: string; jobTitleId?: string }) => void;
  } = $props();
  const api = new WorkforceFilterOptionsApi();
  let loadedOrg = '';
  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === loadedOrg) return;

    loadedOrg = organizationId;
    void api.load();
  });
  const units = $derived((api.options?.units ?? []).map((unit) => ({ value: unit.id, label: unit.name })));
  const titles = $derived((api.options?.jobTitles ?? []).map((title) => ({ value: title.id, label: title.name })));
</script>

<div class="grid min-w-64 grid-cols-2 gap-2">
  <WorkforceSelect
    label={$t('workforce.unit')}
    value={unitId ?? ''}
    options={units}
    onSelect={(value) => onFilterChange({ unitId: value || undefined })}
  />
  <WorkforceSelect
    label={$t('workforce.job_title')}
    value={jobTitleId ?? ''}
    options={titles}
    onSelect={(value) => onFilterChange({ jobTitleId: value || undefined })}
  />
</div>

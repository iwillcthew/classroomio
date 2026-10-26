<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { InputField } from '@cio/ui/custom/input-field';
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { PersonnelScopeApi } from '../api/personnel-scope.svelte';
  import PersonnelFilters from './personnel-filters.svelte';

  let { courseId, onScopeChange }: { courseId?: string; onScopeChange: (profileIds: string[] | null) => void } =
    $props();
  const api = new PersonnelScopeApi();
  let unitId = $state<string | undefined>();
  let jobTitleId = $state<string | undefined>();
  let loadedContext = '';
  const search = new DebouncedSearch({ onApply: applyFilters });

  function applyFilters() {
    if (!$currentOrg.id) return;

    const filters = { search: search.applied, unitId, jobTitleId, courseId };
    void api.load(filters, onScopeChange);
  }

  $effect(() => {
    const organizationId = $currentOrg.id;
    const contextKey = `${organizationId}:${courseId ?? ''}`;
    if (!organizationId || contextKey === loadedContext) return;

    loadedContext = contextKey;
    untrack(applyFilters);
  });
  onDestroy(() => search.destroy());
</script>

<div class="mb-4 flex flex-wrap items-end gap-3">
  <InputField
    label={$t('workforce.search')}
    placeholder={$t('workforce.search_hint')}
    bind:value={search.draft}
    onInput={() => search.input(search.draft)}
  />
  <PersonnelFilters
    {unitId}
    {jobTitleId}
    onFilterChange={(patch) => {
      if ('unitId' in patch) unitId = patch.unitId;
      if ('jobTitleId' in patch) jobTitleId = patch.jobTitleId;
      search.takePending();
      applyFilters();
    }}
  />
</div>
{#if api.error}<p role="alert" class="ui:text-destructive mb-4 text-sm">{$t('workforce.errors.request_failed')}</p>{/if}

<script lang="ts">
  import * as Page from '@cio/ui/base/page';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { t } from '$lib/utils/functions/translations';
  import { currentOrg } from '$lib/utils/store/org';
  import { onDestroy } from 'svelte';
  import { WorkforceApi } from '../api/workforce.svelte';
  import Employees from '../components/employees.svelte';
  import WorkforceDirectory from '../components/workforce-directory.svelte';
  import WorkforceTraining from '../components/workforce-training.svelte';
  import WorkforceReports from '../components/workforce-reports.svelte';
  import MyTraining from '../components/my-training.svelte';
  import type { WorkforceTab } from '../utils/types';

  const api = new WorkforceApi();
  let loadedOrganizationId = '';
  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === loadedOrganizationId) return;

    loadedOrganizationId = organizationId;
    void api.load();
    void api.loadAssignments();
  });
  onDestroy(() => api.search.destroy());
  const tabs = $derived<WorkforceTab[]>(
    api.overview?.actor.canManage
      ? ['employees', 'directory', 'training', 'reports', 'my-training']
      : api.overview?.actor.unitIds.length || api.overview?.actor.reportIds.length
        ? ['employees', 'reports', 'my-training']
        : ['my-training']
  );
</script>

<svelte:head><title>{$t('workforce.title')} · MP Learning</title></svelte:head>

<Page.Root>
  <Page.Header
    ><Page.HeaderContent
      ><Page.Title>{$t('workforce.title')}</Page.Title><Page.Subtitle>{$t('workforce.subtitle')}</Page.Subtitle
      ></Page.HeaderContent
    ></Page.Header
  >
  <Page.Body>
    {#snippet child()}
      {#if !api.overview && !api.error}
        <div class="space-y-4"><Skeleton class="h-12 w-full" /><Skeleton class="h-72 w-full" /></div>
      {:else}
        <nav class="mb-5 flex flex-wrap gap-2" aria-label={$t('workforce.title')}>
          {#each tabs as tab (tab)}<Button
              size="sm"
              variant={api.tab === tab ? 'default' : 'outline'}
              aria-pressed={api.tab === tab}
              onclick={() => api.selectTab(tab)}
              testId={`workforce-tab-${tab}`}>{$t(`workforce.tabs.${tab}`)}</Button
            >{/each}
        </nav>
        {#if api.notice}<p role="status" class="ui:bg-muted mb-4 rounded-lg p-3 text-sm">{$t(api.notice)}</p>{/if}
        {#if api.error}<p role="alert" class="ui:text-destructive mb-4 text-sm">{$t(api.errorKey)}</p>{/if}
        {#if api.overview}
          {#if api.tab === 'employees'}<Employees {api} />
          {:else if api.tab === 'directory' && api.overview.actor.canManage}<WorkforceDirectory {api} />
          {:else if api.tab === 'training' && api.overview.actor.canManage}<WorkforceTraining {api} />
          {:else if api.tab === 'reports'}<WorkforceReports {api} />
          {:else}<MyTraining {api} />{/if}
        {/if}
      {/if}
    {/snippet}
  </Page.Body>
</Page.Root>

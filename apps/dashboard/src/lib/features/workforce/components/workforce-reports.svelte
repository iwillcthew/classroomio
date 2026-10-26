<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import { Progress } from '@cio/ui/base/progress';
  import { t } from '$lib/utils/functions/translations';
  import WorkforceFilters from './workforce-filters.svelte';
  import type { WorkforceApi } from '../api/workforce.svelte';
  let { api }: { api: WorkforceApi } = $props();
  const rows = $derived(api.report ?? []);
</script>

<div class="space-y-4">
  <WorkforceFilters {api} />
  <p class="ui:text-muted-foreground text-sm">{$t('workforce.report_description')}</p>
  <Button size="sm" variant="outline" onclick={() => api.downloadCsv('report')}>{$t('workforce.export_report')}</Button>
  <div class="overflow-x-auto rounded-lg border">
    <table class="w-full text-left text-sm">
      <thead class="ui:bg-muted"
        ><tr>
          <th class="p-3">{$t('workforce.unit')}</th><th class="p-3">{$t('workforce.employees')}</th><th class="p-3"
            >{$t('workforce.assigned')}</th
          ><th class="p-3">{$t('workforce.completed')}</th><th class="p-3">{$t('workforce.remaining')}</th><th
            class="p-3">{$t('workforce.completion_rate')}</th
          >
        </tr></thead
      ><tbody>
        {#each rows as row (row.unitId)}
          <tr class="border-t"
            ><td class="p-3 font-medium">{row.unit}</td><td class="p-3">{row.employees}</td><td class="p-3"
              >{row.assigned}</td
            ><td class="p-3">{row.completed}</td><td class="p-3">{row.remaining}</td><td class="min-w-40 p-3">
              {#if row.completionRate !== null}<div class="flex items-center gap-3">
                  <Progress
                    class="h-2 w-24"
                    max={100}
                    value={row.completionRate}
                    aria-label={$t('workforce.completion_rate')}
                  /><span>{row.completionRate}%</span>
                </div>{:else}{$t('workforce.no_assignments')}{/if}
            </td></tr
          >
        {:else}<tr><td colspan="6" class="p-8 text-center ui:text-muted-foreground">{$t('workforce.empty')}</td></tr
          >{/each}
      </tbody>
    </table>
  </div>
</div>

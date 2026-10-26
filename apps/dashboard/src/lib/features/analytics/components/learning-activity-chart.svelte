<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import type { LearningReportDay } from '../utils/types';
  import { getLearningActivityScale } from '../utils/learning-analytics-utils';
  import * as Table from '@cio/ui/base/table';

  let { days }: { days: LearningReportDay[] } = $props();
  const maximum = $derived(getLearningActivityScale(days));
  const hasActivity = $derived(days.some((day) => day.lessons > 0 || day.submissions > 0));
  const labelInterval = $derived(Math.max(1, Math.ceil(days.length / 6)));

  function formatDay(value: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date(`${value}T12:00:00+07:00`));
  }
</script>

<div class="space-y-3">
  <div class="flex items-center justify-between gap-4">
    <div class="ui:text-muted-foreground flex flex-wrap gap-4 text-xs">
      <span class="inline-flex items-center gap-2"
        ><span class="ui:bg-primary size-2 rounded-sm"></span>{$t('learning_analytics.lessons')}</span
      >
      <span class="inline-flex items-center gap-2"
        ><span class="ui:bg-brand-cyan size-2 rounded-sm"></span>{$t('learning_analytics.submissions')}</span
      >
    </div>
    <span class="ui:text-muted-foreground text-[10px] tabular-nums">0–{maximum}</span>
  </div>
  <div class="relative pt-2">
    <div class="pointer-events-none absolute inset-x-0 top-2 flex h-36 flex-col justify-between" aria-hidden="true">
      {#each [0, 1, 2, 3] as gridLine (gridLine)}<span class="ui:border-border block border-t border-dashed"
        ></span>{/each}
    </div>
    <div
      class="relative flex h-44 items-start"
      style:gap={days.length > 31 ? '1px' : days.length > 7 ? '2px' : '4px'}
      role="img"
      aria-label={$t('learning_analytics.activity_chart_label')}
    >
      {#each days as day, index (day.date)}
        <div class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <div
            class="flex h-36 w-full items-end justify-center"
            style:gap={days.length > 31 ? '0px' : '2px'}
            title={`${formatDay(day.date)} · ${$t('learning_analytics.lessons')}: ${day.lessons} · ${$t('learning_analytics.submissions')}: ${day.submissions}`}
          >
            <span class="ui:bg-primary w-full max-w-3 rounded-t-sm" style:height={`${(day.lessons / maximum) * 100}%`}
            ></span>
            <span
              class="ui:bg-brand-cyan w-full max-w-3 rounded-t-sm"
              style:height={`${(day.submissions / maximum) * 100}%`}
            ></span>
          </div>
          <span class="ui:text-muted-foreground h-4 text-[10px] whitespace-nowrap tabular-nums"
            >{index % labelInterval === 0 || index === days.length - 1 ? formatDay(day.date) : ''}</span
          >
        </div>
      {/each}
    </div>
  </div>
  {#if !hasActivity}<p class="ui:text-muted-foreground text-center text-xs">
      {$t('learning_analytics.no_activity')}
    </p>{/if}
  <details class="ui:border-border border-t pt-3">
    <summary class="ui:text-primary cursor-pointer text-xs font-medium">{$t('learning_analytics.daily_data')}</summary>
    <div class="mt-3 max-h-56 overflow-auto">
      <Table.Root>
        <Table.Header
          ><Table.Row
            ><Table.Head>{$t('learning_analytics.date')}</Table.Head><Table.Head
              >{$t('learning_analytics.lessons')}</Table.Head
            ><Table.Head>{$t('learning_analytics.submissions')}</Table.Head></Table.Row
          ></Table.Header
        >
        <Table.Body
          >{#each days as day (day.date)}<Table.Row
              ><Table.Cell>{formatDay(day.date)}</Table.Cell><Table.Cell>{day.lessons}</Table.Cell><Table.Cell
                >{day.submissions}</Table.Cell
              ></Table.Row
            >{/each}</Table.Body
        >
      </Table.Root>
    </div>
  </details>
</div>

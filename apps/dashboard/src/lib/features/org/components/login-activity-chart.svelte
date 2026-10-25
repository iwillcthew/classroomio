<script module lang="ts">
  function loadChart() {
    if (typeof window === 'undefined') return Promise.reject(new Error('browser-only'));
    return import('@cio/ui/base/chart');
  }
</script>

<script lang="ts">
  import { browser } from '$app/environment';
  import type { ChartConfig } from '@cio/ui/base/chart/types';
  import { Spinner } from '@cio/ui/base/spinner';
  import ChartColumnIcon from '@lucide/svelte/icons/chart-column';
  import SectionCard from '$features/ui/section-card.svelte';
  import { t } from '$lib/utils/functions/translations';
  import type { LoginActivityData } from '$features/org/utils/types';

  interface Props {
    data: LoginActivityData;
  }

  let { data }: Props = $props();

  const chartConfig = $derived({
    count: {
      label: $t('dashboard.login_activity_logins'),
      color: 'var(--chart-1)'
    }
  } satisfies ChartConfig);

  const series = $derived([
    {
      key: 'count',
      value: 'count',
      label: chartConfig.count.label,
      color: 'var(--color-count)'
    }
  ]);

  const hasData = $derived(data !== null && data.some((d) => d.count > 0));
</script>

<SectionCard title={$t('dashboard.login_activity_title')} description={$t('dashboard.login_activity_description')}>
  <div class="flex h-full flex-col justify-center">
    {#if browser && hasData}
      {#await loadChart() then C}
        <C.ChartContainer class="h-[240px] w-full" config={chartConfig}>
          <C.BarChart {data} x="day" axis="x" {series} />
        </C.ChartContainer>
      {/await}
    {:else if hasData}
      <div class="flex h-[240px] items-center justify-center">
        <Spinner class="ui:text-muted-foreground size-6" />
      </div>
    {:else}
      <div
        class="ui:bg-muted/50 ui:text-muted-foreground flex h-[240px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-sm"
      >
        <ChartColumnIcon class="ui:text-muted-foreground/70 size-6" />
        {$t('dashboard.login_activity_no_data')}
      </div>
    {/if}
  </div>
</SectionCard>

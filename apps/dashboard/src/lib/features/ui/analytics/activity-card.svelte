<script lang="ts">
  import type { Component } from 'svelte';
  import type { ResolvedPathname } from '$app/paths';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import { cn } from '@cio/ui/tools';

  interface Activity {
    icon: Component;
    title: string;
    percentage: number | string;
    description: string;
    hidePercentage?: boolean;
    className?: string;
    href?: ResolvedPathname;
  }

  interface Props {
    activity: Activity;
    className?: string;
    classes?: {
      container?: string;
      icon?: string;
      title?: string;
      percentage?: string;
      description?: string;
    };
  }

  let { activity, className = '', classes = {} }: Props = $props();

  const containerClass = $derived(
    cn(
      'ui:bg-card ui:text-card-foreground ui:shadow-card relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border p-5',
      className,
      classes.container
    )
  );
</script>

{#snippet content()}
  <span class="ui:bg-facet absolute inset-x-0 top-0 h-[3px] opacity-0 transition-opacity group-hover:opacity-100"
  ></span>
  <div class="flex items-center gap-2.5">
    <span
      class={cn(
        'ui:bg-accent ui:text-accent-foreground grid size-8 shrink-0 place-items-center rounded-lg',
        classes.icon
      )}
    >
      <activity.icon class="custom size-4" strokeWidth={1.9} />
    </span>
    <p class={cn('ui:text-muted-foreground truncate text-[13px] font-medium', classes.title)}>
      {activity.title}
    </p>
  </div>
  <div class="space-y-1">
    <p class={cn('text-[28px] leading-none font-semibold tracking-[-0.02em] tabular-nums', classes.percentage)}>
      {activity.percentage}{#if !activity.hidePercentage}<span class="ui:text-muted-foreground ml-0.5 text-lg">%</span
        >{/if}
    </p>
    {#if activity.description}
      <p class={cn('ui:text-muted-foreground text-xs leading-relaxed', classes.description)}>
        {activity.description}
      </p>
    {/if}
  </div>
{/snippet}

{#if activity.href}
  <a
    href={activity.href}
    class={cn(
      containerClass,
      'group ui:hover:border-primary/40 ui:hover:shadow-raised transition-[box-shadow,border-color]'
    )}
  >
    {@render content()}
    <ArrowUpRightIcon
      class="ui:text-muted-foreground absolute top-5 right-5 size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      aria-hidden="true"
    />
  </a>
{:else}
  <div class={cn(containerClass, 'group')}>
    {@render content()}
  </div>
{/if}

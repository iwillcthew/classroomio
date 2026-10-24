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
      'ui:bg-card ui:text-card-foreground flex w-full items-start justify-between gap-4 rounded-xl border p-5',
      className,
      classes.container
    )
  );
</script>

{#snippet content()}
  <div class="min-w-0 space-y-1">
    <p class={cn('ui:text-muted-foreground text-sm font-medium', classes.title)}>
      {activity.title}
    </p>
    <p class={cn('text-3xl font-semibold tracking-tight tabular-nums', classes.percentage)}>
      {activity.percentage}{#if !activity.hidePercentage}%{/if}
    </p>
    {#if activity.description}
      <p class={cn('ui:text-muted-foreground text-xs leading-relaxed', classes.description)}>
        {activity.description}
      </p>
    {/if}
  </div>

  <div class={cn('ui:bg-primary/10 ui:text-primary grid size-11 shrink-0 place-items-center rounded-xl', classes.icon)}>
    <activity.icon class="custom size-5" />
  </div>
{/snippet}

{#if activity.href}
  <a
    href={activity.href}
    class={cn(containerClass, 'group ui:hover:border-primary/60 ui:hover:bg-muted/40 relative transition-colors')}
  >
    {@render content()}
    <ArrowUpRightIcon
      class="ui:text-muted-foreground absolute right-3 bottom-3 h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      aria-hidden="true"
    />
  </a>
{:else}
  <div class={containerClass}>
    {@render content()}
  </div>
{/if}

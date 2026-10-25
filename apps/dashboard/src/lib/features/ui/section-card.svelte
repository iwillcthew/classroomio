<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cn } from '@cio/ui/tools';

  interface Props {
    title: string;
    description?: string;
    class?: string;
    bodyClass?: string;
    action?: Snippet;
    children: Snippet;
  }

  let { title, description, class: className = '', bodyClass = '', action, children }: Props = $props();
</script>

<section
  class={cn('ui:bg-card ui:text-card-foreground ui:shadow-card flex min-w-0 flex-col rounded-xl border', className)}
>
  <header class="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
    <div class="min-w-0 space-y-0.5">
      <h2 class="text-[15px] leading-snug font-semibold tracking-tight">{title}</h2>
      {#if description}
        <p class="ui:text-muted-foreground text-[13px] leading-relaxed">{description}</p>
      {/if}
    </div>
    {#if action}
      <div class="flex shrink-0 items-center gap-2">
        {@render action()}
      </div>
    {/if}
  </header>
  <div class={cn('flex flex-1 flex-col px-5 pb-5', bodyClass)}>
    {@render children()}
  </div>
</section>

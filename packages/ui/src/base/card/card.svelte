<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../../tools';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="card"
  class={cn(
    'ui:bg-card ui:text-card-foreground ui:shadow-card ui:flex ui:flex-col ui:gap-5 ui:rounded-xl ui:border ui:py-5',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>

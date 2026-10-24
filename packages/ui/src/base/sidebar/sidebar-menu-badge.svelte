<script lang="ts">
  import { cn, type WithElementRef } from '../../tools';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<div
  bind:this={ref}
  data-slot="sidebar-menu-badge"
  data-sidebar="menu-badge"
  class={cn(
    'ui:bg-sidebar-accent ui:text-sidebar-foreground/70 ui:pointer-events-none ui:ml-auto ui:flex ui:h-5 ui:min-w-6 ui:shrink-0 ui:select-none ui:items-center ui:justify-center ui:rounded-full ui:px-1.5 ui:text-[11px] ui:font-semibold ui:tabular-nums',
    'ui:group-data-[collapsible=icon]:hidden',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</div>

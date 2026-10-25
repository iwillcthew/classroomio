<script lang="ts">
  import { cn, type WithElementRef } from '../../tools';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
</script>

<p
  bind:this={ref}
  data-slot="page-eyebrow"
  class={cn(
    'ui:flex ui:items-center ui:gap-2 ui:text-[11px] ui:font-semibold ui:uppercase ui:tracking-[0.08em] ui:text-primary',
    className
  )}
  {...restProps}
>
  <span class="ui:bg-facet ui:facet-clip ui:h-2.5 ui:w-4 ui:shrink-0" aria-hidden="true"></span>
  {@render children?.()}
</p>

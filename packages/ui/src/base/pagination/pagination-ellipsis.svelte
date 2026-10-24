<script lang="ts">
  import EllipsisIcon from '@lucide/svelte/icons/ellipsis';
  import { cn, uiLabels, type WithElementRef, type WithoutChildren } from '../../tools';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildren<WithElementRef<HTMLAttributes<HTMLSpanElement>>> = $props();
</script>

<span
  bind:this={ref}
  aria-hidden="true"
  data-slot="pagination-ellipsis"
  class={cn('ui:flex ui:size-9 ui:items-center ui:justify-center', className)}
  {...restProps}
>
  <EllipsisIcon class="ui:size-4" />
  <span class="sr-only">{uiLabels.pagination_more_pages}</span>
</span>

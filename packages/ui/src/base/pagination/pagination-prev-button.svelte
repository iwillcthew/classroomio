<script lang="ts">
  import { Pagination as PaginationPrimitive } from 'bits-ui';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import { cn, uiLabels } from '../../tools';
  import { buttonVariants } from '../button';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: PaginationPrimitive.PrevButtonProps = $props();
</script>

{#snippet Fallback()}
  <ChevronLeftIcon class="ui:size-4" />
  <span>{uiLabels.pagination_previous}</span>
{/snippet}

<PaginationPrimitive.PrevButton
  bind:ref
  aria-label={uiLabels.pagination_previous_aria}
  class={cn(
    buttonVariants({
      size: 'default',
      variant: 'ghost',
      class: 'ui:gap-1 ui:px-2.5 ui:sm:pl-2.5'
    }),
    className
  )}
  children={children || Fallback}
  {...restProps}
/>

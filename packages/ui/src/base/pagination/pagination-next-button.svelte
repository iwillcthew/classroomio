<script lang="ts">
  import { Pagination as PaginationPrimitive } from 'bits-ui';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { cn, uiLabels } from '../../tools';
  import { buttonVariants } from '../button';

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: PaginationPrimitive.NextButtonProps = $props();
</script>

{#snippet Fallback()}
  <span>{uiLabels.pagination_next}</span>
  <ChevronRightIcon class="ui:size-4" />
{/snippet}

<PaginationPrimitive.NextButton
  bind:ref
  aria-label={uiLabels.pagination_next_aria}
  class={cn(
    buttonVariants({
      size: 'default',
      variant: 'ghost',
      class: 'ui:gap-1 ui:px-2.5 ui:sm:pr-2.5'
    }),
    className
  )}
  children={children || Fallback}
  {...restProps}
/>

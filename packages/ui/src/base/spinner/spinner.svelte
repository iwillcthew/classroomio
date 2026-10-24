<script lang="ts">
  import { cn, uiLabels } from '../../tools';
  // import Loader2Icon from '@lucide/svelte/icons/loader-2';
  import LoaderIcon from '@lucide/svelte/icons/loader';
  import type { ComponentProps } from 'svelte';

  let { class: className, ...restProps }: ComponentProps<typeof LoaderIcon> = $props();
</script>

<LoaderIcon
  role="status"
  aria-label={uiLabels.loading}
  class={cn('ui:size-4 ui:animate-spin', className)}
  {...restProps}
/>

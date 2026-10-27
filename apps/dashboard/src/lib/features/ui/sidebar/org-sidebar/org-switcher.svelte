<script lang="ts">
  import * as Breadcrumb from '@cio/ui/base/breadcrumb';
  import { BRAND } from '$lib/utils/constants/brand';
  import { currentOrgPath } from '$lib/utils/store/org';

  interface Props {
    variant?: 'sidebar' | 'breadcrumb';
  }

  let { variant = 'sidebar' }: Props = $props();
</script>

{#if variant === 'breadcrumb'}
  <Breadcrumb.Link href={`${$currentOrgPath}/dash`} class="flex items-center gap-2">
    <img src={BRAND.mark} alt="" class="size-6 object-contain" />
    <span class="hidden truncate text-sm font-medium md:block">{BRAND.product}</span>
  </Breadcrumb.Link>
{:else}
  <a href={`${$currentOrgPath}/dash`} class="flex items-center gap-3 px-2 py-1.5">
    <img src={BRAND.mark} alt="" class="size-8 rounded-lg bg-white object-contain" />
    <div class="grid min-w-0 text-sm leading-tight">
      <span class="truncate font-semibold">{BRAND.product}</span>
      <span class="truncate text-xs">{BRAND.name}</span>
    </div>
  </a>
{/if}

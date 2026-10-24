<script lang="ts">
  import { resolve } from '$app/paths';
  import { t } from '$lib/utils/functions/translations';
  import { BRAND } from '$lib/utils/constants/brand';

  interface Props {
    logo: string | undefined;
    orgName: string | undefined;
  }

  let { logo, orgName }: Props = $props();

  const displayName = $derived(orgName || BRAND.product);
</script>

<div class="logo">
  <a
    href={resolve('/', {})}
    title={$t('navigation.goto_org_home', { orgName: displayName })}
    class="flex items-center gap-2"
    id="logo"
    data-hveid="8"
  >
    <img
      src={logo || BRAND.mark}
      alt={`${displayName} logo`}
      class="mx-auto inline-block w-9 rounded"
      width="36"
      height="36"
    />
    {#if orgName}
      <span class="line-clamp-1 hidden text-sm font-medium md:block">{orgName}</span>
    {/if}
  </a>
</div>

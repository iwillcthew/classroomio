<script lang="ts">
  import AppTopbar from './app-topbar.svelte';
  import LmsBreadcrumbs from './lms-breadcrumbs.svelte';

  interface Props {
    hideSearch?: boolean;
  }

  let { hideSearch = false }: Props = $props();
</script>

<AppTopbar searchScope="lms" {hideSearch}>
  {#snippet breadcrumbs()}
    <LmsBreadcrumbs />
  {/snippet}
</AppTopbar>

<script lang="ts">
  import AppTopbar from './app-topbar.svelte';
  import AppBreadcrumbs from './app-breadcrumbs.svelte';
</script>

<AppTopbar>
  {#snippet breadcrumbs()}
    <AppBreadcrumbs />
  {/snippet}
</AppTopbar>

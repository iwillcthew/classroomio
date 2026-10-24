<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { onMount } from 'svelte';
  import { logout } from '$lib/utils/functions/logout';

  onMount(() => {
    logout();
  });
</script>

<div class="flex min-h-screen w-full items-center justify-center">
  <div>{$t('auth.logout.logging_out')}</div>
</div>

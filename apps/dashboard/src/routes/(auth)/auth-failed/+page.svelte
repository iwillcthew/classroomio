<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { page } from '$app/state';
  import { AuthUI } from '$features/ui';
  import { Button } from '@cio/ui/base/button';
  import * as Card from '@cio/ui/base/card';
  import { currentOrg } from '$lib/utils/store/org';
  import * as Avatar from '@cio/ui/base/avatar';

  const errorCode = $derived(new URLSearchParams(page.url.search).get('error'));

  function goHome() {
    window.location.href = errorCode === 'access' ? '/logout' : '/';
  }
</script>

<svelte:head>
  <title>{$t('page_titles.reset_password')} · MP Learning</title>
</svelte:head>

<AuthUI isLogin={false} showOnlyContent={true}>
  <div class="flex flex-col items-center gap-4">
    <Avatar.Root>
      <Avatar.Image
        src={$currentOrg.avatarUrl ? $currentOrg.avatarUrl : '/logo-192.png'}
        alt={$currentOrg.name ? $currentOrg.name : 'MP Learning'}
      />
      <Avatar.Fallback>{$currentOrg.name ? $currentOrg.name : 'MP Learning'}</Avatar.Fallback>
    </Avatar.Root>

    <p class="text-xl font-semibold">
      {$t(errorCode === 'access' ? 'mp_learning.access.title' : 'auth.auth_failed.title')}
    </p>

    {#if errorCode}
      <Card.Description class="border px-2 py-1">
        {$t('auth.auth_failed.code', { code: errorCode })}
      </Card.Description>
    {/if}

    <Card.Description class="text-center">
      {$t(errorCode === 'access' ? 'mp_learning.access.description' : 'auth.auth_failed.description')}
    </Card.Description>

    <Button onclick={goHome} class=""
      >{$t(errorCode === 'access' ? 'settings.profile.logout' : 'common.restricted_page.home')}</Button
    >
  </div>
</AuthUI>

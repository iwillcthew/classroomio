<script lang="ts">
  import { page } from '$app/state';
  interface Props {
    children?: import('svelte').Snippet;
  }

  import * as Page from '@cio/ui/base/page';
  import { t } from '$lib/utils/functions/translations';

  let { children }: Props = $props();

  const SHARED_HEADER_TITLES: Record<string, string> = {
    '/settings/org': 'settings.sidebar.branding',
    '/settings/customize-lms': 'settings.tabs.customize_lms_tab',
    '/settings/domains': 'settings.tabs.domains_tab',
    '/settings/teams': 'settings.tabs.teams_tab'
  };

  const sharedHeaderTitleKey = $derived(
    Object.entries(SHARED_HEADER_TITLES).find(([suffix]) => page.url.pathname.endsWith(suffix))?.[1]
  );
  const isWideSettingsPage = $derived(page.url.pathname.endsWith('/settings/emails'));
</script>

<Page.Root class={`w-full gap-2 pb-12 lg:mx-auto ${isWideSettingsPage ? 'md:max-w-6xl' : 'md:max-w-3xl'}`}>
  {#if sharedHeaderTitleKey}
    <Page.Header>
      <Page.HeaderContent>
        <Page.Eyebrow>{$t('settings.sidebar.workspace')}</Page.Eyebrow>
        <Page.Title>{$t(sharedHeaderTitleKey)}</Page.Title>
        {#if sharedHeaderTitleKey === 'settings.sidebar.branding'}
          <Page.Subtitle>{$t('settings.organization.page_subtitle')}</Page.Subtitle>
        {/if}
      </Page.HeaderContent>
    </Page.Header>
  {/if}

  {@render children?.()}
</Page.Root>

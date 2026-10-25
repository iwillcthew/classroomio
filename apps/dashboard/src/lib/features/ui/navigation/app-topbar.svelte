<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import * as Popover from '@cio/ui/base/popover';
  import { Button } from '@cio/ui/base/button';
  import BellIcon from '@lucide/svelte/icons/bell';
  import Search from '$features/ui/search.svelte';
  import { notificationsApi } from '$features/notifications/api/notifications.svelte';
  import NotificationsPanel from '$features/notifications/components/notifications-panel.svelte';
  import { t } from '$lib/utils/functions/translations';

  interface Props {
    breadcrumbs: Snippet;
    actions?: Snippet;
    searchScope?: 'lms';
    hideSearch?: boolean;
  }

  let { breadcrumbs, actions, searchScope, hideSearch = false }: Props = $props();

  const notificationCount = $derived(notificationsApi.unreadCount);

  onMount(() => {
    notificationsApi.fetchOnce();
  });
</script>

<header
  class="ui:border-border ui:bg-background/85 sticky top-0 z-50 flex h-14 w-full shrink-0 items-center border-b backdrop-blur-md backdrop-saturate-150"
>
  <div class="flex w-full min-w-0 items-center gap-3 px-4 md:px-6">
    <Sidebar.Trigger testId="app-sidebar-trigger" class="ui:text-muted-foreground -ml-1" />
    <span class="ui:bg-border h-5 w-px shrink-0" aria-hidden="true"></span>

    <div class="min-w-0 flex-1">
      {@render breadcrumbs()}
    </div>

    {@render actions?.()}

    {#if !hideSearch}
      <Search scope={searchScope} />
    {/if}

    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="ghost"
            size="icon"
            class="relative"
            aria-label={$t('settings.tabs.notifications_tab')}
            testId="app-notifications-trigger"
          >
            <BellIcon class="ui:text-muted-foreground size-[18px]" />
            {#if notificationCount > 0}
              <span
                class="ui:bg-danger ui:ring-background absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ring-2"
              >
                {notificationCount}
              </span>
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content align="end" sideOffset={8} class="ui:p-0! w-[min(420px,calc(100vw-2rem))] rounded-xl">
        <NotificationsPanel />
      </Popover.Content>
    </Popover.Root>
  </div>
</header>

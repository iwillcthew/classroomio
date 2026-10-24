<script lang="ts">
  import { Separator } from '@cio/ui/base/separator';
  import { t } from '$lib/utils/functions/translations';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import BellIcon from '@lucide/svelte/icons/bell';
  import { Button } from '@cio/ui/base/button';
  import * as Popover from '@cio/ui/base/popover';
  import Search from '../search.svelte';
  import LmsBreadcrumbs from './lms-breadcrumbs.svelte';
  import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
  import * as Empty from '@cio/ui/base/empty';
  import VisitOrgSiteBtn from '../visit-org-site-btn.svelte';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';

  interface Props {
    hideSearch?: boolean;
  }

  let { hideSearch = false }: Props = $props();
</script>

<header
  class="ui:border-border ui:bg-card/90 sticky top-0 z-50 flex h-14 w-full shrink-0 items-center gap-2 border-b backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
  <div class="flex w-full items-center gap-2 px-4 md:px-6">
    <Sidebar.Trigger />

    <div class="h-4 w-2">
      <Separator orientation="vertical" />
    </div>

    <LmsBreadcrumbs />

    <span class="grow"></span>

    {#if !hideSearch}
      <VisitOrgSiteBtn variant="outline" labelKey="lms.view_landing_page" pathname="/" icon={ExternalLinkIcon} />

      <Search scope="lms" />

      <Popover.Root>
        <Popover.Trigger>
          <Button variant="outline" size="icon">
            <BellIcon class="custom rounded-full" />
          </Button>
        </Popover.Trigger>
        <Popover.Content>
          <Empty.Root class="ui:from-muted/50 ui:to-background h-full bg-gradient-to-b from-30%">
            <Empty.Header>
              <Empty.Media variant="icon">
                <BellIcon />
              </Empty.Media>
              <Empty.Title>{$t('notifications.empty_title')}</Empty.Title>
              <Empty.Description>{$t('notifications.empty_description')}</Empty.Description>
            </Empty.Header>
            <Empty.Content>
              <Button variant="outline" size="sm">
                <RefreshCcwIcon />
                {$t('notifications.refresh')}
              </Button>
            </Empty.Content>
          </Empty.Root>
        </Popover.Content>
      </Popover.Root>
    {/if}
  </div>
</header>

<script lang="ts">
  import * as Sidebar from '@cio/ui/base/sidebar';
  import UsersRoundIcon from '@lucide/svelte/icons/users-round';
  import { t } from '$lib/utils/functions/translations';
  import { cohortApi } from '../api';
</script>

<header
  class="ui:border-border ui:bg-background/85 ui:z-app-bar sticky top-0 flex h-14 w-full shrink-0 items-center border-b backdrop-blur-md backdrop-saturate-150"
>
  <div class="flex w-full min-w-0 items-center gap-3 px-4 md:px-6">
    <Sidebar.Trigger class="ui:text-muted-foreground -ml-1" />
    <span class="ui:bg-border h-5 w-px shrink-0" aria-hidden="true"></span>

    <div class="flex min-w-0 items-center gap-2 text-sm">
      <span class="ui:text-muted-foreground hidden items-center gap-1.5 md:flex">
        <UsersRoundIcon class="size-4" />
        {$t('org_navigation.cohorts')}
      </span>
      <span class="ui:text-muted-foreground/70 hidden md:inline" aria-hidden="true">/</span>
      <p class="truncate font-medium">{cohortApi.cohort?.name || ''}</p>
    </div>
  </div>
</header>

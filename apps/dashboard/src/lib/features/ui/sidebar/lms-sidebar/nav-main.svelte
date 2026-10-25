<script lang="ts">
  import { currentOrg } from '$lib/utils/store/org';
  import * as Sidebar from '@cio/ui/base/sidebar';
  import { t } from '$lib/utils/functions/translations';
  import { page } from '$app/state';
  import { getLmsNavigationItems } from '$features/ui/navigation/lms-navigation';

  const items = $derived(
    getLmsNavigationItems($currentOrg, $t, page.url.pathname).filter((item) => !item.hideFromSidebar)
  );
</script>

<Sidebar.Group class="py-1!">
  <Sidebar.GroupLabel>{$t('lms_navigation.group_learning')}</Sidebar.GroupLabel>
  <Sidebar.Menu class="gap-0.5">
    {#each items as item (item.path)}
      <Sidebar.MenuItem>
        <Sidebar.MenuButton tooltipContent={item.title} isActive={item.isActive}>
          {#snippet child({ props })}
            <a href={item.url} {...props}>
              {#if item.icon}
                {@const Icon = item.icon}
                <Icon size={17} strokeWidth={1.75} class="custom" />
              {/if}
              <span>{item.title}</span>
            </a>
          {/snippet}
        </Sidebar.MenuButton>
      </Sidebar.MenuItem>
    {/each}
  </Sidebar.Menu>
</Sidebar.Group>

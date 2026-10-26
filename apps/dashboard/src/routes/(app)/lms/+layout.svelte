<script lang="ts">
  import * as Sidebar from '@cio/ui/base/sidebar';
  import LmsHeader from '$features/ui/navigation/lms-header.svelte';
  import { LMSSidebar } from '$features/ui/sidebar/lms-sidebar';
  import { ScrollToTop } from '@cio/ui/custom/scroll-to-top';
  import { t } from '$lib/utils/functions/translations';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<Sidebar.Provider>
  <LMSSidebar />

  <Sidebar.Inset>
    <LmsHeader />

    <div class="mx-auto flex w-full max-w-[1360px] min-w-0 flex-1 flex-col gap-4 px-4 md:px-8 lg:px-10">
      {@render children?.()}
    </div>
    <ScrollToTop label={$t('common.scroll_to_top')} />
  </Sidebar.Inset>
</Sidebar.Provider>

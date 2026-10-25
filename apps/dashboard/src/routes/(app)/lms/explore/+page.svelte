<script lang="ts">
  import { ExplorePage } from '$features/lms/pages';
  import { t } from '$lib/utils/functions/translations';
  import * as Page from '@cio/ui/base/page';
</script>

<svelte:head>
  <title>{$t('page_titles.explore')} · MP Learning</title>
</svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow>{$t('lms_navigation.group_learning')}</Page.Eyebrow>
      <Page.Title>{$t('lms_navigation.explore')}</Page.Title>
      <Page.Subtitle>{$t('lms_pages.explore_subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <ExplorePage />
    {/snippet}
  </Page.Body>
</Page.Root>

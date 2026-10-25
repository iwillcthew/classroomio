<script lang="ts">
  import { MyLearningPage } from '$features/lms/pages';
  import { t } from '$lib/utils/functions/translations';
  import * as Page from '@cio/ui/base/page';
</script>

<svelte:head>
  <title>{$t('page_titles.my_learning')} · MP Learning</title>
</svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow>{$t('lms_navigation.group_learning')}</Page.Eyebrow>
      <Page.Title>{$t('lms_navigation.my_learning')}</Page.Title>
      <Page.Subtitle>{$t('lms_pages.my_learning_subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <MyLearningPage />
    {/snippet}
  </Page.Body>
</Page.Root>

<script lang="ts">
  import { ExercisesPage } from '$features/lms/pages';
  import { t } from '$lib/utils/functions/translations';
  import * as Page from '@cio/ui/base/page';
</script>

<svelte:head>
  <title>{$t('page_titles.exercises')} · MP Learning</title>
</svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow>{$t('lms_navigation.group_learning')}</Page.Eyebrow>
      <Page.Title>{$t('exercises.heading')}</Page.Title>
      <Page.Subtitle>{$t('lms_pages.exercises_subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <ExercisesPage />
    {/snippet}
  </Page.Body>
</Page.Root>

<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { CommunityQuestionPage } from '$features/community/pages';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  let { data } = $props();

  const communityPath = $derived(page.url.pathname.replace(/\/[^/]+$/, ''));
</script>

<svelte:head>
  <title>{$t('page_titles.question')} · MP Learning</title>
</svelte:head>

<CommunityQuestionPage slug={data.slug} question={data.question} backHref={resolve(communityPath, {})} />

<script>
  import { t } from '$lib/utils/functions/translations';
  import { DomainsPage } from '$features/settings/pages';
</script>

<svelte:head>
  <title>{$t('page_titles.custom_domain')} · MP Learning</title>
</svelte:head>

<DomainsPage />

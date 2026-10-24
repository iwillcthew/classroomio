<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import { OrgAiTutorSettingsPage } from '$features/ai-tutor-settings';
</script>

<svelte:head>
  <title>{$t('page_titles.ai_tutor_settings')} · MP Learning</title>
</svelte:head>

<OrgAiTutorSettingsPage />

<script lang="ts">
  import CircleContent from './circle-content.svelte';
  import { t } from '$lib/utils/functions/translations';

  interface Props {
    answers?: number;
  }

  let { answers = 0 }: Props = $props();
</script>

<CircleContent value={answers} label={$t('components.quiz.answer')} />

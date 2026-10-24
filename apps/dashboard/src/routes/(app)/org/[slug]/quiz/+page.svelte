<script>
  import { t } from '$lib/utils/functions/translations';
  import { Quizzes, NewQuizModal, DeleteModal } from '$features/org';
  import { Button } from '@cio/ui/base/button';
  import { createQuizModal } from '$lib/utils/store/org';
  import { isMobile } from '$lib/utils/store/useMobile';
  import PlusIcon from '@lucide/svelte/icons/plus';
</script>

<svelte:head>
  <title>{$t('page_titles.quiz')} · MP Learning</title>
</svelte:head>

<section class="mx-auto w-full max-w-6xl">
  <div class="px-5 py-10">
    <div class="mb-10 flex items-center justify-between">
      <h1 class="text-2xl md:text-3xl dark:text-white">{$t('quiz.list.heading')}</h1>
      {#if $isMobile}
        <Button onclick={() => ($createQuizModal.open = true)}>
          <PlusIcon size={16} />
        </Button>
      {:else}
        <Button onclick={() => ($createQuizModal.open = true)}>{$t('quiz.list.create')}</Button>
      {/if}
    </div>

    <NewQuizModal />
    <DeleteModal />

    <Quizzes />
  </div>
</section>

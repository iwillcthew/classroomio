<script lang="ts">
  import cloneDeep from 'lodash/cloneDeep';
  import { profile } from '$lib/utils/store/user';
  import { currentOrg } from '$lib/utils/store/org';
  import { snackbar } from '$features/ui/snackbar/store';
  import { lmsExercisesApi, type LMSExercise } from '$features/lms/api/exercises.svelte';
  import { calDateDiff } from '$lib/utils/functions/date';
  import { t } from '$lib/utils/functions/translations';

  const defaultSections = [
    {
      id: 0,
      title: $t('exercises.not_submitted'),
      items: [],
      className: 'ui:bg-danger-soft ui:text-danger-foreground'
    },
    {
      id: 1,
      title: $t('exercises.submitted'),
      items: [],
      className: 'ui:bg-warning-soft ui:text-warning-foreground'
    },
    {
      id: 2,
      title: $t('exercises.in_progress'),
      items: [],
      className: 'ui:bg-info-soft ui:text-info-foreground'
    },
    {
      id: 3,
      title: $t('exercises.graded'),
      value: 0,
      items: [],
      className: 'ui:bg-success-soft ui:text-success-foreground'
    }
  ];
  let sections: Section[] = $state(cloneDeep(defaultSections));
  let hasFetched = $state(false);

  interface Section {
    id: number;
    title: string;
    className: string;
    items: ExerciseItem[];
  }

  interface ExerciseItem {
    courseTitle: string;
    courseURL: string;
    exerciseId: string;
    exerciseTitle: string;
    exerciseURL: string;
    grade: string;
    lessonNo: string;
    lessonTitle: string;
    lessonURL: string | null;
    submissionStatus: number;
    submissionUpdatedAt: string;
  }

  function generateSections(exercises: LMSExercise[]): Section[] {
    const _sections: Section[] = cloneDeep(defaultSections);

    for (const exercise of exercises) {
      const { id, title, updated_at, submission, lesson, questions } = exercise;

      const submissionItem = submission[0] || {
        status_id: 0,
        updated_at,
        total: 0
      };

      const courseURL = `/courses/${lesson.course.id}`;
      const lessonURL = lesson.id ? `${courseURL}/lessons/${lesson.id}` : null;
      const exerciseURL = `${courseURL}/exercises/${id}`;

      const grade = `${submissionItem.total}/${questions.reduce((acc, cur) => (acc += cur.points), 0)}`;

      const item: ExerciseItem = {
        exerciseId: id,
        courseTitle: lesson.course.title,
        courseURL,
        exerciseTitle: title,
        exerciseURL,
        lessonTitle: lesson.title,
        lessonNo: lesson.order < 9 ? '0' + (lesson.order + 1) : `${lesson.order}`,
        lessonURL,
        submissionStatus: submissionItem.status_id,
        submissionUpdatedAt: calDateDiff(submissionItem.updated_at),
        grade
      };

      _sections[submissionItem.status_id].items.push(item);
    }

    return _sections;
  }

  async function fetchData(profileId?: string, orgId?: string) {
    if (hasFetched || !profileId || !orgId) {
      return;
    }

    hasFetched = true;

    await lmsExercisesApi.fetchLMSExercises(orgId);

    if (!lmsExercisesApi.success) {
      snackbar.error('snackbar.exercise.error_fetching');
      return;
    }

    if (!lmsExercisesApi.exercises || lmsExercisesApi.exercises.length === 0) return;

    sections = generateSections(lmsExercisesApi.exercises);
  }

  $effect(() => {
    fetchData($profile.id, $currentOrg.id);
  });
</script>

<div class="grid w-full gap-4 pb-10 md:grid-cols-2 xl:grid-cols-4">
  {#each sections as { title, items, className, id } (id)}
    <section class="ui:bg-muted/50 flex max-h-[70vh] min-w-0 flex-col rounded-xl border p-3">
      <header class="mb-2 flex items-center justify-between gap-2 px-1">
        <p class="text-sm font-semibold">{title}</p>
        <span class={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${className}`}>{items.length}</span>
      </header>
      <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {#each items as item (item.exerciseId)}
          <article class="ui:bg-card ui:shadow-card rounded-lg border p-3">
            <a class="ui:text-primary line-clamp-1 text-xs font-medium hover:underline" href={item.courseURL}>
              {item.courseTitle}
            </a>
            <a class="mt-1 block text-sm leading-snug font-medium hover:underline" href={item.exerciseURL}>
              {#if id === 3}
                <span class="ui:text-success-foreground">({item.grade})</span>
              {/if}
              {item.exerciseTitle}
            </a>
            {#if item.lessonURL}
              <a class="ui:text-muted-foreground mt-1.5 block text-xs hover:underline" href={item.lessonURL}>
                {$t('exercises.lesson')} <span class="italic">{item.lessonTitle}</span>
              </a>
            {/if}
            <p class="ui:text-muted-foreground mt-2 text-[11px]">{item.submissionUpdatedAt}</p>
          </article>
        {:else}
          <p class="ui:text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-xs">
            {$t('lms_pages.exercises_column_empty')}
          </p>
        {/each}
      </div>
    </section>
  {/each}
</div>

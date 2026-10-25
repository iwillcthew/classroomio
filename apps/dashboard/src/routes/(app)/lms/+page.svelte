<script lang="ts">
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { DashboardPage } from '$features/lms/pages';
  import { getGreeting } from '$lib/utils/functions/date';
  import { t } from '$lib/utils/functions/translations';
  import { profile } from '$lib/utils/store/user';
  import { coursesApi } from '$features/course/api';
  import * as Page from '@cio/ui/base/page';

  const todayLabel = new Intl.DateTimeFormat(getIntlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const firstName = $derived($profile.fullname?.trim().split(/\s+/).at(-1) || $t('dashboard.learner'));

  let totalCompleted = $derived(
    coursesApi.enrolledCourses.reduce((acc, course) => {
      const exercisesCompleted =
        'exercisesCompleted' in course && typeof course.exercisesCompleted === 'number' ? course.exercisesCompleted : 0;

      return acc + (course.progressRate || 0) + exercisesCompleted;
    }, 0)
  );

  let totalLessons = $derived(
    coursesApi.enrolledCourses.reduce((acc, course) => {
      const exercises =
        'exerciseCount' in course && typeof course.exerciseCount === 'number' ? course.exerciseCount : 0;

      return acc + (course.lessonCount || 0) + exercises;
    }, 0)
  );

  let progressPercentage = $derived(totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0);
</script>

<svelte:head>
  <title>{$t('lms_navigation.home')} · MP Learning</title>
</svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow class="first-letter:uppercase">{todayLabel}</Page.Eyebrow>
      <Page.Title>{$t(getGreeting())}, {firstName}</Page.Title>
      <Page.Subtitle>
        {#if totalLessons > 0}
          {$t('dashboard.lms_today_progress', { progress: progressPercentage })}
        {:else}
          {$t('dashboard.lms_today_empty')}
        {/if}
      </Page.Subtitle>
    </Page.HeaderContent>
  </Page.Header>

  <Page.Body>
    {#snippet child()}
      <DashboardPage />
    {/snippet}
  </Page.Body>
</Page.Root>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { Badge } from '@cio/ui/base/badge';
  import { Button } from '@cio/ui/base/button';
  import { Progress } from '@cio/ui/base/progress';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Empty } from '@cio/ui/custom/empty';
  import { ActivityCard } from '$features/ui';
  import SectionCard from '$features/ui/section-card.svelte';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import AwardIcon from '@lucide/svelte/icons/award';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import FlameIcon from '@lucide/svelte/icons/flame';
  import LibraryBigIcon from '@lucide/svelte/icons/library-big';
  import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
  import TargetIcon from '@lucide/svelte/icons/target';
  import VideoIcon from '@lucide/svelte/icons/video';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { classroomio } from '$lib/utils/services/api';
  import { currentOrg } from '$lib/utils/store/org';
  import { profile } from '$lib/utils/store/user';
  import { coursesApi } from '$features/course/api';
  import CourseCover from '$features/course/components/course-cover.svelte';
  import UpcomingSessionsCard from '$features/lms/components/upcoming-sessions-card.svelte';
  import CoursePreviewModal from '$features/lms/components/course-preview-modal.svelte';
  import type { RecommendedCourses } from '$features/course/types';
  import {
    getStudentCourseComplianceDate,
    getStudentCourseComplianceStatusKey,
    getStudentCourseComplianceStatusVariant,
    getStudentCourseProgressPercent,
    isStudentCourseComplete
  } from '$features/course/utils/compliance-utils';
  import { getStudentCourseContinuePath } from '$features/course/utils/student-course-navigation';

  type EnrolledCourse = (typeof coursesApi.enrolledCourses)[number];

  let loginStreak = $state<number | null>(null);
  let hasLoadedLoginStreak = $state(false);
  let selectedCourse = $state<RecommendedCourses[number] | null>(null);
  let previewOpen = $state(false);

  const dateFormatter = new Intl.DateTimeFormat(getIntlLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

  let totalCompleted = $derived(
    coursesApi.enrolledCourses.reduce((acc, course) => acc + getCourseCompletedItems(course), 0)
  );
  let totalLessons = $derived(coursesApi.enrolledCourses.reduce((acc, course) => acc + getCourseTotalItems(course), 0));
  let progressPercentage = $derived(totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0);

  let complianceCourses = $derived(coursesApi.enrolledCourses.filter((course) => course.type === 'COMPLIANCE'));
  let completedComplianceCourses = $derived(complianceCourses.filter((course) => isStudentCourseComplete(course)));
  let complianceScore = $derived(
    complianceCourses.length > 0
      ? Math.round((completedComplianceCourses.length / complianceCourses.length) * 100)
      : null
  );

  let inProgressCourses = $derived(coursesApi.enrolledCourses.filter((course) => !isStudentCourseComplete(course)));
  let prioritizedCourses = $derived.by(() => prioritizeCourses(inProgressCourses));
  let heroCourse = $derived(prioritizedCourses[0] ?? null);
  let otherCourses = $derived(prioritizedCourses.slice(1, 5));
  let hasEnrolledCourses = $derived(coursesApi.enrolledCourses.length > 0);
  let isInitialLoading = $derived(coursesApi.isLoading && coursesApi.enrolledCourses.length === 0);

  let upcomingSessions = $derived(
    coursesApi.enrolledCourses
      .filter((course) => course.type === 'LIVE_CLASS' && course.upcomingSession)
      .map((course) => ({
        lessonId: course.upcomingSession!.lessonId,
        courseTitle: course.title,
        lessonTitle: course.upcomingSession!.lessonTitle,
        callUrl: course.upcomingSession!.callUrl,
        lessonAt: course.upcomingSession!.lessonAt,
        timezone: course.upcomingSession!.sessionTimezone
      }))
      .sort((a, b) => new Date(a.lessonAt).getTime() - new Date(b.lessonAt).getTime())
  );

  $effect(() => {
    if (!$profile.id || !$currentOrg.id) return;

    coursesApi.getEnrolledCourses();
    coursesApi.getRecommendedCourses({ limit: 3 });
  });

  $effect(() => {
    if (!$profile.id || hasLoadedLoginStreak) return;

    hasLoadedLoginStreak = true;
    loadLoginStreak();
  });

  function getCourseCompletedItems(course: EnrolledCourse) {
    const exercisesCompleted =
      'exercisesCompleted' in course && typeof course.exercisesCompleted === 'number' ? course.exercisesCompleted : 0;

    return (course.progressRate || 0) + exercisesCompleted;
  }

  function getCourseTotalItems(course: EnrolledCourse) {
    const exercises = 'exerciseCount' in course && typeof course.exerciseCount === 'number' ? course.exerciseCount : 0;

    return (course.lessonCount || 0) + exercises;
  }

  function getDueTimestamp(course: EnrolledCourse) {
    const complianceDate = getStudentCourseComplianceDate(course);

    return complianceDate?.value ? new Date(complianceDate.value).getTime() : Number.POSITIVE_INFINITY;
  }

  function prioritizeCourses(courses: EnrolledCourse[]) {
    return [...courses].sort((leftCourse, rightCourse) => {
      const dueDifference = getDueTimestamp(leftCourse) - getDueTimestamp(rightCourse);

      if (Number.isFinite(dueDifference) && dueDifference !== 0) {
        return dueDifference;
      }

      return getStudentCourseProgressPercent(rightCourse) - getStudentCourseProgressPercent(leftCourse);
    });
  }

  function formatComplianceDate(course: EnrolledCourse) {
    const complianceDate = getStudentCourseComplianceDate(course);

    if (!complianceDate?.value) return null;

    return { label: $t(complianceDate.labelKey), value: dateFormatter.format(new Date(complianceDate.value)) };
  }

  async function loadLoginStreak() {
    try {
      const response = await classroomio.dash['login-streak'].$get();
      const result = await response.json();

      if (result.success) {
        loginStreak = result.data.daysActive;
      }
    } catch (error) {
      console.error('Failed to load login streak', error);
      loginStreak = 0;
    }
  }

  function gotoCourse(id: string | undefined) {
    if (!id) return;

    goto(getStudentCourseContinuePath(id));
  }
</script>

<div class="flex flex-col gap-5 pb-10">
  {#if upcomingSessions.length}
    <UpcomingSessionsCard sessions={upcomingSessions} />
  {/if}

  {#if isInitialLoading}
    <Skeleton class="h-56 w-full rounded-2xl" />
  {:else}
    <section class="ui:bg-facet ui:shadow-raised relative overflow-hidden rounded-2xl text-white">
      <svg
        class="pointer-events-none absolute inset-y-0 right-0 h-full w-auto opacity-25"
        viewBox="0 0 400 300"
        aria-hidden="true"
      >
        <path d="M200 -10 L280 -10 L180 310 L100 310 Z" fill="#ffffff" fill-opacity="0.35" />
        <path d="M280 -10 L330 -10 L230 310 L180 310 Z" fill="#ffffff" fill-opacity="0.6" />
        <path d="M330 -10 L410 -10 L410 40 L300 310 L230 310 Z" fill="#ffffff" fill-opacity="0.2" />
      </svg>

      <div class="relative grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_260px] md:p-8">
        <div class="flex min-w-0 flex-col gap-5">
          <div class="space-y-2">
            <p class="text-[11px] font-semibold tracking-[0.1em] text-white/70 uppercase">
              {heroCourse ? $t('dashboard.pick_up_where_you_left_off') : $t('dashboard.learning_awaits_you')}
            </p>
            <h2 class="line-clamp-2 text-2xl leading-tight font-semibold tracking-tight text-balance md:text-[28px]">
              {heroCourse
                ? heroCourse.title
                : $t(hasEnrolledCourses ? 'lms_home.hero_all_done_title' : 'lms_home.hero_empty_title')}
            </h2>
            {#if heroCourse}
              {@const dueInfo = formatComplianceDate(heroCourse)}
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
                <span>
                  {$t('dashboard.items_done', {
                    completed: getCourseCompletedItems(heroCourse),
                    total: getCourseTotalItems(heroCourse)
                  })}
                </span>
                {#if heroCourse.type === 'COMPLIANCE'}
                  <span class="flex items-center gap-1.5">
                    <ShieldCheckIcon class="custom size-4" />{$t('lms_home.mandatory')}
                  </span>
                {/if}
                {#if dueInfo}
                  <span class="flex items-center gap-1.5">
                    <CalendarClockIcon class="custom size-4" />{dueInfo.label}: {dueInfo.value}
                  </span>
                {/if}
              </div>
            {:else}
              <p class="max-w-lg text-sm leading-relaxed text-white/80">
                {$t(hasEnrolledCourses ? 'lms_home.hero_all_done_description' : 'lms_home.hero_empty_description')}
              </p>
            {/if}
          </div>

          {#if heroCourse}
            {@const heroProgress = getStudentCourseProgressPercent(heroCourse)}
            <div class="flex max-w-md items-center gap-3">
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-white to-sky-200 transition-[width] duration-500"
                  style:width={`${heroProgress}%`}
                ></div>
              </div>
              <span class="text-sm font-semibold tabular-nums">{heroProgress}%</span>
            </div>
          {/if}

          <div class="flex flex-wrap items-center gap-2">
            {#if heroCourse}
              <Button
                class="ui:text-brand-navy bg-white shadow-sm hover:bg-white/90"
                onclick={() => gotoCourse(heroCourse.id)}
              >
                {$t('dashboard.continue_learning')}
                <ArrowRightIcon class="size-4" />
              </Button>
              {#if heroCourse.type === 'LIVE_CLASS' && heroCourse.upcomingSession?.callUrl}
                <Button
                  variant="ghost"
                  href={heroCourse.upcomingSession.callUrl}
                  target="_blank"
                  rel="noreferrer"
                  class="text-white hover:bg-white/10 hover:text-white"
                >
                  <VideoIcon class="size-4" />{$t('course.navItem.lessons.session.join')}
                </Button>
              {/if}
            {:else}
              <Button class="ui:text-brand-navy bg-white shadow-sm hover:bg-white/90" href="/lms/explore">
                <LibraryBigIcon class="size-4" />
                {$t('lms_home.open_library')}
              </Button>
            {/if}
          </div>
        </div>

        {#if heroCourse}
          <div class="hidden md:block">
            <CourseCover
              title={heroCourse.title}
              src={heroCourse.bannerImage}
              class="aspect-[4/3] w-full rounded-xl shadow-lg ring-1 ring-white/25"
              initialsClass="text-4xl"
            />
          </div>
        {/if}
      </div>
    </section>
  {/if}

  <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
    <ActivityCard
      activity={{
        icon: TargetIcon,
        title: $t('dashboard.progress'),
        percentage: progressPercentage,
        description: $t('dashboard.items_done', { completed: totalCompleted, total: totalLessons })
      }}
    />
    <ActivityCard
      activity={{
        icon: ShieldCheckIcon,
        title: $t('dashboard.compliance'),
        percentage: complianceScore ?? '--',
        description: $t('dashboard.compliance_met', {
          completed: completedComplianceCourses.length,
          total: complianceCourses.length
        }),
        hidePercentage: complianceScore === null
      }}
    />
    <ActivityCard
      activity={{
        icon: FlameIcon,
        title: $t('dashboard.streak'),
        percentage: loginStreak ?? 0,
        description: $t('dashboard.days_active'),
        hidePercentage: true
      }}
    />
  </section>

  <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
    <SectionCard title={$t('dashboard.currently_learning')} bodyClass="px-2! pb-2!">
      {#snippet action()}
        <Button variant="ghost" size="sm" class="ui:text-primary" href="/lms/mylearning">
          {$t('dashboard.view_more')}
        </Button>
      {/snippet}

      {#if isInitialLoading}
        <div class="space-y-2 px-3 pb-3">
          {#each Array(3) as _, index (index)}
            <Skeleton class="h-16 w-full rounded-lg" />
          {/each}
        </div>
      {:else if otherCourses.length > 0}
        <ul class="ui:divide-border divide-y">
          {#each otherCourses as course (course.id)}
            {@const courseProgress = getStudentCourseProgressPercent(course)}
            <li>
              <button
                type="button"
                class="group ui:hover:bg-muted/60 flex w-full items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors"
                onclick={() => gotoCourse(course.id)}
              >
                <CourseCover
                  title={course.title}
                  src={course.bannerImage}
                  class="aspect-video w-24 shrink-0 rounded-md"
                  initialsClass="text-sm bottom-1.5 left-2"
                />
                <div class="min-w-0 flex-1 space-y-2">
                  <p class="line-clamp-1 text-sm font-medium">{course.title}</p>
                  <div class="flex items-center gap-3">
                    <Progress value={courseProgress} max={100} class="h-1.5 flex-1" />
                    <span class="ui:text-muted-foreground w-9 text-right text-xs tabular-nums">{courseProgress}%</span>
                  </div>
                </div>
                <ChevronRightIcon
                  class="ui:text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <Empty
          title={heroCourse ? $t('lms_home.no_other_courses') : $t('dashboard.no_courses')}
          description={heroCourse ? $t('lms_home.recommended_description') : $t('dashboard.start_course')}
          icon={BookOpenIcon}
        >
          <Button variant="outline" size="sm" href="/lms/explore">{$t('lms_home.open_library')}</Button>
        </Empty>
      {/if}
    </SectionCard>

    <SectionCard title={$t('lms_home.mandatory_title')} description={$t('lms_home.mandatory_description')}>
      {#if isInitialLoading}
        <div class="space-y-3">
          {#each Array(3) as _, index (index)}
            <Skeleton class="h-12 w-full rounded-lg" />
          {/each}
        </div>
      {:else if complianceCourses.length > 0}
        <ul class="flex flex-col gap-2">
          {#each prioritizeCourses(complianceCourses) as course (course.id)}
            {@const statusKey = getStudentCourseComplianceStatusKey(course)}
            {@const dueInfo = formatComplianceDate(course)}
            <li>
              <button
                type="button"
                class="ui:hover:border-primary/40 ui:hover:bg-muted/40 flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors"
                onclick={() => gotoCourse(course.id)}
              >
                <span class="ui:bg-accent ui:text-accent-foreground grid size-8 shrink-0 place-items-center rounded-lg">
                  <ShieldCheckIcon class="custom size-4" />
                </span>
                <span class="min-w-0 flex-1 space-y-1">
                  <span class="line-clamp-2 block text-sm leading-snug font-medium">{course.title}</span>
                  {#if dueInfo}
                    <span class="ui:text-muted-foreground block text-xs">{dueInfo.label}: {dueInfo.value}</span>
                  {/if}
                </span>
                {#if statusKey}
                  <Badge variant={getStudentCourseComplianceStatusVariant(course)} class="shrink-0">
                    {$t(statusKey)}
                  </Badge>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="ui:bg-success-soft ui:text-success-foreground flex items-start gap-3 rounded-lg p-4 text-sm">
          <AwardIcon class="custom mt-0.5 size-4 shrink-0" />
          <p>{$t('lms_home.mandatory_empty')}</p>
        </div>
      {/if}
    </SectionCard>
  </div>

  {#if coursesApi.isLoading || coursesApi.recommendedCourses.length > 0}
    <section class="space-y-3">
      <div class="flex items-end justify-between gap-4">
        <div class="space-y-0.5">
          <h2 class="text-[15px] font-semibold tracking-tight">{$t('dashboard.explore_more_courses')}</h2>
          <p class="ui:text-muted-foreground text-[13px]">{$t('lms_home.recommended_description')}</p>
        </div>
        <Button variant="ghost" size="sm" class="ui:text-primary" href="/lms/explore">
          {$t('dashboard.view_more')}
        </Button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#if coursesApi.isLoading && coursesApi.recommendedCourses.length === 0}
          {#each Array(3) as _, index (index)}
            <Skeleton class="h-56 w-full rounded-xl" />
          {/each}
        {:else}
          {#each coursesApi.recommendedCourses as course (course.id)}
            <button
              type="button"
              class="group ui:bg-card ui:shadow-card ui:hover:shadow-raised ui:hover:border-primary/40 flex flex-col overflow-hidden rounded-xl border text-left transition-[box-shadow,border-color]"
              onclick={() => {
                selectedCourse = course;
                previewOpen = true;
              }}
            >
              <CourseCover title={course.title} src={course.bannerImage} class="aspect-[16/8] w-full" />
              <span class="flex flex-1 flex-col gap-1.5 p-4">
                <span class="line-clamp-2 text-sm leading-snug font-semibold">{course.title}</span>
                {#if course.description}
                  <span class="ui:text-muted-foreground line-clamp-2 text-xs leading-relaxed">{course.description}</span
                  >
                {/if}
                <span class="ui:text-muted-foreground mt-auto pt-2 text-xs">
                  {$t('lms_home.lesson_count', { count: course.lessonCount ?? 0 })}
                </span>
              </span>
            </button>
          {/each}
        {/if}
      </div>
    </section>
  {/if}

  {#if selectedCourse}
    <CoursePreviewModal course={selectedCourse} bind:open={previewOpen} />
  {/if}
</div>

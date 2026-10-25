<script lang="ts">
  import * as Sidebar from '@cio/ui/base/sidebar';
  import * as ButtonGroup from '@cio/ui/base/button-group';
  import * as DropdownMenu from '@cio/ui/base/dropdown-menu';
  import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
  import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical';
  import { Button } from '@cio/ui/base/button';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { page } from '$app/state';
  import { currentOrg, currentOrgDomain } from '$lib/utils/store/org';
  import { isStudentExperience, isCourseLearnerView } from '$lib/utils/store/app';
  import { isMobileStore } from '@cio/ui/hooks/is-mobile.svelte';
  import { getCourseProgress } from '$features/course/utils/content';
  import { isCourseMobileBottomNavVisible } from '$features/course/utils/mobile-bottom-nav';
  import SparklesIcon from '@lucide/svelte/icons/sparkles';
  import { setupProgressApi } from '$features/setup/api/setup-progress.svelte';
  import { courseApi } from '$features/course/api';
  import { getActiveCourseNavKey } from '$features/course/utils/functions';
  import { toggleAiAssistant } from '$features/ai-assistant/utils/store';
  import { IS_AI_ENABLED } from '$lib/utils/constants/ai';
  import { openCoursePreview } from '$features/course/utils/course-preview';
  import { t } from '$lib/utils/functions/translations';
  import CourseProgressPopover from './course-progress-popover.svelte';
  import { Badge } from '@cio/ui/base/badge';
  import CoursePublishBadge from './course-publish-badge.svelte';
  import CoursePublicBadge from './course-public-badge.svelte';
  import CourseContextMenuContent from './course-context-menu-content.svelte';
  import ViewAsStudentModal from './view-as-student-modal.svelte';
  import ViewCourseSiteUnpublishedModal from './view-course-site-unpublished-modal.svelte';

  const siteName = $derived($currentOrg.siteName);
  const showCoursePublishBadge = $derived(!$isStudentExperience);
  const isPublicCourse = $derived(courseApi.course?.type === 'PUBLIC');
  const activeNavKey = $derived(getActiveCourseNavKey(page.url.pathname, courseApi.course?.id ?? ''));
  const isPublished = $derived(courseApi.course?.isPublished ?? false);
  const lessonId = $derived(page.params.lessonId as string | undefined);
  const exerciseId = $derived(page.params.exerciseId as string | undefined);
  const showMobileBottomNav = $derived(
    isCourseMobileBottomNavVisible({
      isCourseLearnerView: $isCourseLearnerView,
      isMobile: isMobileStore.current,
      isLessonOrExercisePage: Boolean(lessonId || exerciseId),
      courseProgress: getCourseProgress(courseApi.course)
    })
  );

  let viewAsStudentOpen = $state(false);
  let viewCourseSiteUnpublishedOpen = $state(false);

  $effect(() => {
    if (!siteName) return;

    setupProgressApi.fetchSetupProgress(siteName);
  });

  function handleViewCourseSite() {
    const course = courseApi.course;
    if (!course?.id) {
      return;
    }

    if (course.isTemplate) return;

    if (!isPublished) {
      viewCourseSiteUnpublishedOpen = true;
      return;
    }

    openCoursePreview({
      courseId: course.id,
      courseSlug: course.slug,
      currentOrgDomain: $currentOrgDomain
    });
  }
</script>

<header
  class="ui:border-border ui:bg-background/85 ui:z-app-bar sticky top-0 flex h-14 w-full shrink-0 items-center border-b backdrop-blur-md backdrop-saturate-150"
>
  <div class="flex w-full min-w-0 items-center gap-3 px-4 md:px-6">
    <Sidebar.Trigger class="ui:text-muted-foreground -ml-1" />
    <span class="ui:bg-border h-5 w-px shrink-0" aria-hidden="true"></span>

    <div class="flex min-w-0 flex-1 flex-col justify-center">
      <div class="flex min-w-0 items-center gap-2 text-sm">
        {#if courseApi.course?.title}
          <span class="ui:text-muted-foreground hidden max-w-[16rem] truncate md:inline">{courseApi.course.title}</span>
          {#if activeNavKey}
            <ChevronRightIcon class="ui:text-muted-foreground/70 hidden size-3.5 shrink-0 md:inline" />
          {/if}
        {/if}
        <p class="truncate font-medium">
          {activeNavKey ? $t(activeNavKey) : ''}
        </p>

        {#if isPublicCourse}
          <CoursePublicBadge class="shrink-0" />
        {/if}

        {#if courseApi.course?.isTemplate}
          <Badge variant="secondary">{$t('course_templates.editor.badge')}</Badge>
        {:else if showCoursePublishBadge}
          <CoursePublishBadge {isPublished} />
        {/if}
      </div>
    </div>

    <span class="grow"></span>

    {#if $isCourseLearnerView && !showMobileBottomNav}
      <CourseProgressPopover class="md:hidden" />
    {/if}

    {#if IS_AI_ENABLED}
      <Button size="sm" variant="outline" onclick={toggleAiAssistant}>
        <SparklesIcon size={14} class="ui:text-brand-cyan" />
        <span class="hidden sm:inline">{$t('course.navItems.nav_ai_assistant')}</span>
      </Button>
    {/if}

    {#if !$isStudentExperience}
      <ButtonGroup.Root>
        {#if !courseApi.course?.isTemplate && isPublicCourse}
          <Button
            variant="outline"
            size="sm"
            onclick={handleViewCourseSite}
            disabled={!courseApi.course?.id}
            aria-label={$t('course.header.view_course_site')}
          >
            <ExternalLinkIcon size={14} />
            <span class="hidden sm:inline">{$t('course.header.view_course_site')}</span>
          </Button>
        {/if}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="outline"
                size="sm"
                aria-label={$t('courses.course_card.actions_menu_aria')}
                disabled={!courseApi.course?.id}
              >
                <EllipsisVerticalIcon size={14} />
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            {#if courseApi.course}
              <CourseContextMenuContent
                id={courseApi.course.id}
                title={courseApi.course.title}
                description={courseApi.course.description}
                isPublished={courseApi.course.isPublished ?? false}
                courseType={courseApi.course.type}
                slug={courseApi.course.slug ?? ''}
                isTemplate={courseApi.course.isTemplate}
                studentCount={courseApi.group.students.length}
                includeViewAsStudent={true}
                onViewAsStudent={() => (viewAsStudentOpen = true)}
              />
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </ButtonGroup.Root>
    {/if}
  </div>
</header>

<ViewAsStudentModal
  bind:open={viewAsStudentOpen}
  courseId={courseApi.course?.id}
  courseSlug={courseApi.course?.slug}
  currentOrgDomain={$currentOrgDomain}
/>

<ViewCourseSiteUnpublishedModal bind:open={viewCourseSiteUnpublishedOpen} currentOrgDomain={$currentOrgDomain} />

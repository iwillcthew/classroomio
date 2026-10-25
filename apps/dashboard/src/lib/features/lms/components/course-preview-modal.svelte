<script lang="ts">
  import { goto } from '$app/navigation';
  import * as Dialog from '@cio/ui/base/dialog';
  import { Button } from '@cio/ui/base/button';
  import { SafeHtmlContent } from '@cio/ui/custom/safe-html-content';
  import HTMLRender from '$features/ui/html-render.svelte';
  import CourseCover from '$features/course/components/course-cover.svelte';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';
  import InfoIcon from '@lucide/svelte/icons/info';
  import XIcon from '@lucide/svelte/icons/x';
  import { t } from '$lib/utils/functions/translations';
  import { isSelfEnrollmentAllowed } from '@cio/utils/functions';
  import type { RecommendedCourses } from '$features/course/types';
  import { pluralizeLabel } from '$lib/utils/functions/pluralize-label';

  interface Props {
    course: RecommendedCourses[number];
    open: boolean;
  }

  let { course, open = $bindable(false) }: Props = $props();

  type CourseMetadata = {
    allowSelfEnrollment?: boolean;
    allowNewStudent?: boolean;
    requirements?: string;
  };

  const metadata = $derived(course.metadata as CourseMetadata | null);
  const selfEnrollmentAllowed = $derived(isSelfEnrollmentAllowed(metadata));
  const requirements = $derived(metadata?.requirements?.trim() || null);

  function handleEnroll() {
    if (!course.slug) return;

    goto(`/course/${course.slug}/enroll`);
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0" showCloseButton={false}>
    <div class="relative shrink-0">
      <CourseCover
        title={course.title}
        src={course.bannerImage}
        class="aspect-[16/7] w-full"
        initialsClass="text-4xl"
      />
      <Dialog.Close
        class="absolute top-3 right-3 inline-flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/50"
      >
        <XIcon class="custom size-4" />
        <span class="sr-only">{$t('whats_new.close')}</span>
      </Dialog.Close>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
      <h2 class="text-xl leading-snug font-semibold tracking-tight">{course.title}</h2>

      <div class="ui:text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span class="flex items-center gap-1.5">
          <BookOpenIcon class="size-4" />
          {course.lessonCount ?? 0}
          {$t('courses.course_card.lessons_number')}
        </span>
        <span class="flex items-center gap-1.5">
          <ClipboardListIcon class="size-4" />
          {pluralizeLabel($t('courses.course_card.exercise'), course.exerciseCount ?? 0)}
        </span>
      </div>

      {#if course.description}
        <p class="mt-4 text-sm leading-relaxed">{course.description}</p>
      {/if}

      {#if requirements}
        <div class="ui:bg-muted/60 mt-5 rounded-lg p-4">
          <h3 class="text-sm font-semibold">{$t('course.navItem.landing_page.requirement')}</h3>
          <HTMLRender className="text-sm mt-1" disableMaxWidth={true}>
            <SafeHtmlContent content={requirements} />
          </HTMLRender>
        </div>
      {/if}
    </div>

    <Dialog.Footer
      class="flex shrink-0 flex-row items-center justify-between gap-4 border-t px-6 py-4 sm:justify-between"
    >
      <p class="ui:text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
        <InfoIcon class="mt-0.5 size-3.5 shrink-0" />
        {selfEnrollmentAllowed ? $t('lms_home.self_enroll_hint') : $t('lms_home.enroll_via_admin_hint')}
      </p>

      <Button onclick={handleEnroll} disabled={!selfEnrollmentAllowed} class="shrink-0">
        {$t('course.navItem.landing_page.pricing_section.enroll')}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

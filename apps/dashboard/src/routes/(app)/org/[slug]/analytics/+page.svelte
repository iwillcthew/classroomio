<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { t } from '$lib/utils/functions/translations';
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { currentOrg, currentOrgPath, isOrgAdmin } from '$lib/utils/store/org';
  import * as Page from '@cio/ui/base/page';
  import * as Table from '@cio/ui/base/table';
  import { Badge } from '@cio/ui/base/badge';
  import { Button } from '@cio/ui/base/button';
  import { Progress } from '@cio/ui/base/progress';
  import { Skeleton } from '@cio/ui/base/skeleton';
  import { Search } from '@cio/ui/custom/search';
  import { Empty } from '@cio/ui/custom/empty';
  import { UserAvatar } from '@cio/ui/custom/user-avatar';
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
  import BookOpenIcon from '@lucide/svelte/icons/book-open';
  import CheckCheckIcon from '@lucide/svelte/icons/check-check';
  import CircleCheckIcon from '@lucide/svelte/icons/circle-check';
  import ClockIcon from '@lucide/svelte/icons/clock-3';
  import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
  import UsersRoundIcon from '@lucide/svelte/icons/users-round';
  import UserPlusIcon from '@lucide/svelte/icons/user-plus';
  import SectionCard from '$features/ui/section-card.svelte';
  import ExportMenu from '$features/ui/export/export-menu.svelte';
  import RangePicker from '$features/analytics/components/range-picker.svelte';
  import RefreshButton from '$features/analytics/components/refresh-button.svelte';
  import LearningActivityChart from '$features/analytics/components/learning-activity-chart.svelte';
  import { LearningAnalyticsApi } from '$features/analytics/api/learning-analytics.svelte';
  import { buildLearningExport, filterLearningReportCourses } from '$features/analytics/utils/learning-analytics-utils';
  import type { LearningCourseFilter } from '$features/analytics/utils/types';

  const learningApi = new LearningAnalyticsApi();
  let searchValue = $state('');
  let courseFilter = $state<LearningCourseFilter>('all');
  const report = $derived(learningApi.report);
  const snapshot = $derived(report?.snapshot);
  const initialLoading = $derived(!report && learningApi.loading);
  const filteredCourses = $derived(filterLearningReportCourses(snapshot?.courses ?? [], searchValue, courseFilter));
  const courseFilters = ['all', 'assigned', 'overdue'] as const;
  const states = $derived([
    {
      key: 'completed',
      count: snapshot?.completed ?? 0,
      color: 'ui:bg-success',
      label: 'learning_analytics.completed'
    },
    {
      key: 'in_progress',
      count: snapshot?.inProgress ?? 0,
      color: 'ui:bg-primary',
      label: 'learning_analytics.in_progress'
    },
    {
      key: 'not_started',
      count: snapshot?.notStarted ?? 0,
      color: 'ui:bg-muted-foreground/30',
      label: 'learning_analytics.not_started'
    }
  ]);
  const metrics = $derived.by(() => {
    const employeeCoverage = $t('learning_analytics.employee_coverage', { count: snapshot?.employees ?? 0 });
    const completionDescription = $t('learning_analytics.assignment_completion', {
      completed: snapshot?.completed ?? 0,
      total: snapshot?.assignments ?? 0
    });
    const assignmentDescription = $t('learning_analytics.assignment_unit');
    const overdueDescription = $t('learning_analytics.overdue_description');
    const completionValue = report?.completionRate == null ? '—' : `${report.completionRate}%`;
    return [
      {
        icon: UsersRoundIcon,
        label: 'learning_analytics.enrolled_employees',
        value: snapshot?.enrolledEmployees ?? 0,
        description: employeeCoverage,
        tone: 'info'
      },
      {
        icon: CheckCheckIcon,
        label: 'learning_analytics.completion_rate',
        value: completionValue,
        description: completionDescription,
        tone: 'success'
      },
      {
        icon: ClockIcon,
        label: 'learning_analytics.not_started',
        value: snapshot?.notStarted ?? 0,
        description: assignmentDescription,
        tone: 'info'
      },
      {
        icon: ShieldAlertIcon,
        label: 'learning_analytics.overdue',
        value: snapshot?.overdue ?? 0,
        description: overdueDescription,
        tone: 'warning'
      }
    ];
  });
  const exportDocument = $derived.by(() => {
    const headers = {
      course: $t('learning_analytics.course'),
      assigned: $t('learning_analytics.assigned'),
      notStarted: $t('learning_analytics.not_started'),
      inProgress: $t('learning_analytics.in_progress'),
      completed: $t('learning_analytics.completed'),
      overdue: $t('learning_analytics.overdue'),
      progress: $t('learning_analytics.content_progress')
    };
    const title = $t('learning_analytics.title');
    const subtitle = $t('learning_analytics.snapshot_note');
    const courses = snapshot?.courses ?? [];
    return buildLearningExport(courses, title, subtitle, headers);
  });

  $effect(() => {
    const organizationId = $currentOrg.id;
    untrack(() => learningApi.ensureOrganization(organizationId));
  });

  onDestroy(() => learningApi.cancel());

  function formatUpdated(value: string) {
    return new Intl.DateTimeFormat(getIntlLocale(), {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(new Date(value));
  }
</script>

<svelte:head><title>{$t('learning_analytics.title')} · MP Learning</title></svelte:head>

<Page.Root class="w-full pb-8">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow>{$t('learning_analytics.eyebrow')}</Page.Eyebrow>
      <Page.Title>{$t('learning_analytics.title')}</Page.Title>
      <Page.Subtitle>{$t('learning_analytics.subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
    <Page.Action>
      <ExportMenu
        document={exportDocument}
        estimatedRowCount={snapshot?.courses.length ?? 0}
        disabled={!report || learningApi.loading || !snapshot?.courses.length}
        testId="learning-report-export"
      />
      <RefreshButton loading={learningApi.loading} onClick={() => learningApi.load()} />
    </Page.Action>
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      {#if learningApi.failed}
        <div
          role="alert"
          class="ui:bg-danger-soft ui:text-danger-foreground flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm"
        >
          <p>{$t('learning_analytics.load_error')}</p>
          <Button variant="outline" size="sm" onclick={() => learningApi.load()}>{$t('mp_workspace.retry')}</Button>
        </div>
      {/if}
      {#if initialLoading || report}
        <section class="space-y-3" aria-label={$t('learning_analytics.snapshot_title')} aria-busy={initialLoading}>
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">{$t('learning_analytics.snapshot_title')}</h2>
              <p class="ui:text-muted-foreground text-xs leading-relaxed">{$t('learning_analytics.snapshot_note')}</p>
            </div>
            {#if report}<span class="ui:text-muted-foreground text-[11px]"
                >{$t('learning_analytics.updated', { time: formatUpdated(report.generatedAt) })}</span
              >{/if}
          </div>
          <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {#each metrics as metric (metric.label)}
              <div class="ui:bg-card ui:shadow-card flex flex-col gap-4 rounded-xl border p-4 md:p-5">
                <div class="flex items-start justify-between gap-2">
                  <p class="ui:text-muted-foreground text-xs leading-relaxed font-medium">{$t(metric.label)}</p>
                  <span class="metric-icon" data-tone={metric.tone}><metric.icon class="custom size-4" /></span>
                </div>
                <div>
                  {#if initialLoading}<Skeleton class="mb-2 h-8 w-16" />{:else}<p
                      class="text-[28px] leading-none font-semibold tracking-tight tabular-nums"
                    >
                      {metric.value}
                    </p>{/if}
                  {#if initialLoading}<Skeleton class="mt-2 h-3 w-full" />{:else}<p
                      class="ui:text-muted-foreground mt-2 text-[11px] leading-relaxed"
                    >
                      {metric.description}
                    </p>{/if}
                </div>
              </div>
            {/each}
          </div>
        </section>

        <section
          class="ui:bg-card ui:shadow-card flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between md:p-5"
          aria-label={$t('learning_analytics.assignment_states')}
        >
          <div class="space-y-1">
            <h2 class="text-sm font-semibold">{$t('learning_analytics.assignment_states')}</h2>
            <p class="ui:text-muted-foreground text-xs">{$t('learning_analytics.assignment_definition')}</p>
          </div>
          <div class="w-full space-y-2 md:max-w-lg">
            {#if initialLoading}<Skeleton class="h-2 w-full" />
            {:else}<div class="ui:bg-muted flex h-2 overflow-hidden rounded-full" aria-hidden="true">
                {#each states as state (state.key)}<span
                    class={state.color}
                    style:width={`${snapshot?.assignments ? (state.count / snapshot.assignments) * 100 : 0}%`}
                  ></span>{/each}
              </div>{/if}
            <div class="flex flex-wrap justify-between gap-2 text-[11px]">
              {#each states as state (state.key)}<span class="ui:text-muted-foreground inline-flex items-center gap-1.5"
                  ><span class={`size-1.5 rounded-full ${state.color}`}></span>{$t(state.label)}<strong
                    class="ui:text-foreground ml-1 font-medium tabular-nums"
                    >{initialLoading ? '—' : state.count}</strong
                  ></span
                >{/each}
            </div>
          </div>
        </section>

        <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
          <SectionCard
            title={$t('learning_analytics.activity_title')}
            description={$t('learning_analytics.activity_note')}
          >
            {#snippet action()}<span
                class="ui:bg-accent ui:text-accent-foreground rounded-md px-2 py-1 text-[10px] font-medium"
                >{$t('learning_analytics.timezone')}</span
              >{/snippet}
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span class="ui:text-muted-foreground text-xs">{$t('learning_analytics.period')}</span><RangePicker
                value={learningApi.range}
                onChange={(days) => learningApi.load(days)}
              />
            </div>
            {#if learningApi.loading}<div class="space-y-4">
                <div class="grid grid-cols-3 gap-3">
                  {#each [0, 1, 2] as index (index)}<Skeleton class="h-14 w-full" />{/each}
                </div>
                <Skeleton class="h-48 w-full rounded-lg" />
              </div>
            {:else if learningApi.failed}
              <p class="ui:text-muted-foreground py-10 text-sm">{$t('learning_analytics.load_error')}</p>
            {:else if report}
              <div class="ui:border-border mb-5 grid grid-cols-3 gap-3 border-b pb-4">
                <div>
                  <p class="text-xl font-semibold tabular-nums">{report.activity.activeLearners}</p>
                  <p class="ui:text-muted-foreground mt-1 text-[11px]">{$t('learning_analytics.active_learners')}</p>
                </div>
                <div>
                  <p class="text-xl font-semibold tabular-nums">{report.activity.lessonsCompleted}</p>
                  <p class="ui:text-muted-foreground mt-1 text-[11px]">{$t('learning_analytics.lessons')}</p>
                </div>
                <div>
                  <p class="text-xl font-semibold tabular-nums">{report.activity.submissions}</p>
                  <p class="ui:text-muted-foreground mt-1 text-[11px]">{$t('learning_analytics.submissions')}</p>
                </div>
              </div>
              <LearningActivityChart days={report.activity.daily} />
            {/if}
          </SectionCard>

          <SectionCard
            title={$t('learning_analytics.priorities_title')}
            description={$t('learning_analytics.priorities_note')}
          >
            {#if initialLoading}<div class="space-y-3">
                {#each [0, 1, 2] as index (index)}<Skeleton class="h-16 w-full" />{/each}
              </div>
            {:else if report && snapshot}
              <div class="space-y-3">
                <a
                  href={$isOrgAdmin ? `${$currentOrgPath}/compliance` : '#learning-course-report'}
                  onclick={() => {
                    if (!$isOrgAdmin) courseFilter = 'overdue';
                  }}
                  class="ui:bg-warning-soft ui:text-warning-foreground flex items-center gap-3 rounded-lg p-3"
                  ><ShieldAlertIcon class="custom size-4 shrink-0" /><span
                    class="min-w-0 flex-1 text-xs leading-relaxed">{$t('learning_analytics.overdue')}</span
                  ><strong class="tabular-nums">{snapshot.overdue}</strong><ArrowUpRightIcon class="size-3.5" /></a
                >
                <a
                  href={`${$currentOrgPath}/employees?enrollment=not_enrolled`}
                  class="ui:bg-muted ui:hover:bg-accent flex items-center gap-3 rounded-lg p-3 transition-colors"
                  ><UserPlusIcon class="ui:text-muted-foreground size-4 shrink-0" /><span
                    class="min-w-0 flex-1 text-xs leading-relaxed">{$t('learning_analytics.unassigned')}</span
                  ><strong class="tabular-nums">{report.unassignedEmployees}</strong><ArrowUpRightIcon
                    class="ui:text-muted-foreground size-3.5"
                  /></a
                >
                <a
                  href={`${$currentOrgPath}/employees?completion=not_started`}
                  class="ui:bg-muted ui:hover:bg-accent flex items-center gap-3 rounded-lg p-3 transition-colors"
                  ><ClockIcon class="ui:text-muted-foreground size-4 shrink-0" /><span
                    class="min-w-0 flex-1 text-xs leading-relaxed">{$t('learning_analytics.review_not_started')}</span
                  ><ArrowUpRightIcon class="ui:text-muted-foreground size-3.5" /></a
                >
              </div>
              {#if !snapshot.overdue && !report.unassignedEmployees && !snapshot.notStarted}<p
                  class="ui:text-success-foreground mt-4 flex items-start gap-2 text-xs leading-relaxed"
                >
                  <CircleCheckIcon class="custom mt-0.5 size-4 shrink-0" />{$t('learning_analytics.no_priorities')}
                </p>{/if}
              <div class="ui:border-border mt-5 flex items-center justify-between border-t pt-4 text-xs">
                <span class="ui:text-muted-foreground"
                  >{$t('learning_analytics.course_count', { count: snapshot.courses.length })}</span
                ><a
                  href={`${$currentOrgPath}/courses`}
                  class="ui:text-primary inline-flex items-center gap-1 font-medium"
                  >{$t('learning_analytics.manage_courses')}<ArrowRightIcon class="size-3.5" /></a
                >
              </div>
            {/if}
          </SectionCard>
        </div>

        <section
          id="learning-course-report"
          class="ui:bg-card ui:shadow-card scroll-mt-20 overflow-hidden rounded-xl border"
        >
          <div class="flex flex-wrap items-start justify-between gap-4 p-5">
            <div class="space-y-1">
              <h2 class="text-sm font-semibold">{$t('learning_analytics.courses_title')}</h2>
              <p class="ui:text-muted-foreground text-xs leading-relaxed">{$t('learning_analytics.courses_note')}</p>
            </div>
            <Search placeholder={$t('courses.search_placeholder')} bind:value={searchValue} />
          </div>
          <div class="flex flex-wrap gap-2 px-5 pb-4">
            {#each courseFilters as filter (filter)}<Button
                size="xs"
                variant={courseFilter === filter ? 'default' : 'outline'}
                aria-pressed={courseFilter === filter}
                onclick={() => {
                  courseFilter = filter;
                }}>{$t(`learning_analytics.filters.${filter}`)}</Button
              >{/each}
          </div>
          {#if initialLoading}<div class="space-y-3 p-5">
              {#each [0, 1, 2, 3] as index (index)}<Skeleton class="h-12 w-full" />{/each}
            </div>
          {:else if !snapshot?.courses.length}<Empty
              icon={BookOpenIcon}
              title={$t('learning_analytics.no_courses')}
              description={$t('learning_analytics.no_courses_description')}
              class="md:p-6!"
              ><Button variant="outline" size="sm" href={`${$currentOrgPath}/courses`}
                >{$t('learning_analytics.manage_courses')}</Button
              ></Empty
            >
          {:else if !filteredCourses.length}<Empty
              icon={BookOpenIcon}
              title={$t('mp_workspace.no_results')}
              description={$t('mp_workspace.adjust_search')}
              class="md:p-6!"
            />
          {:else}
            <Table.Root class="min-w-[900px] table-fixed [&_th]:leading-snug [&_th]:whitespace-normal">
              <Table.Header
                ><Table.Row
                  ><Table.Head class="w-[30%]">{$t('learning_analytics.course')}</Table.Head><Table.Head
                    class="text-right">{$t('learning_analytics.filters.assigned')}</Table.Head
                  ><Table.Head class="text-right">{$t('learning_analytics.not_started')}</Table.Head><Table.Head
                    class="text-right">{$t('learning_analytics.in_progress')}</Table.Head
                  ><Table.Head class="text-right">{$t('learning_analytics.completed')}</Table.Head><Table.Head
                    class="text-right">{$t('learning_analytics.filters.overdue')}</Table.Head
                  ><Table.Head class="w-[18%]">{$t('learning_analytics.content_progress')}</Table.Head></Table.Row
                ></Table.Header
              >
              <Table.Body>
                {#each filteredCourses as course (course.id)}
                  <Table.Row
                    ><Table.Cell
                      ><a
                        href={`/courses/${course.id}/people`}
                        class="ui:hover:text-primary flex w-full min-w-0 items-start gap-2 font-medium"
                        ><span class="line-clamp-2 min-w-0">{course.title}</span><ArrowUpRightIcon
                          class="ui:text-muted-foreground mt-0.5 size-3 shrink-0"
                        /></a
                      >
                      <div class="mt-1">
                        {#if !course.isPublished}<Badge variant="outline">{$t('learning_analytics.draft')}</Badge
                          >{:else if course.assigned === 0}<span class="ui:text-muted-foreground text-[11px]"
                            >{$t('learning_analytics.course_unassigned')}</span
                          >{/if}
                      </div></Table.Cell
                    ><Table.Cell class="text-right tabular-nums">{course.assigned}</Table.Cell><Table.Cell
                      class="ui:text-muted-foreground text-right tabular-nums">{course.notStarted}</Table.Cell
                    ><Table.Cell class="text-right tabular-nums">{course.inProgress}</Table.Cell><Table.Cell
                      class="text-right tabular-nums">{course.completed}</Table.Cell
                    ><Table.Cell class="text-right tabular-nums"
                      >{#if course.overdue}<Badge variant="warning">{course.overdue}</Badge>{:else}<span
                          class="ui:text-muted-foreground">0</span
                        >{/if}</Table.Cell
                    ><Table.Cell
                      >{#if course.progress === null}<span class="ui:text-muted-foreground">—</span>{:else}<div
                          class="flex items-center gap-3"
                        >
                          <Progress value={course.progress} class="h-1.5 min-w-16 flex-1" /><span
                            class="w-9 text-right text-xs tabular-nums">{course.progress}%</span
                          >
                        </div>{/if}</Table.Cell
                    ></Table.Row
                  >
                {/each}
              </Table.Body>
            </Table.Root>
          {/if}
          <div class="ui:border-border ui:text-muted-foreground border-t px-5 py-3 text-[11px]">
            {$t('learning_analytics.progress_definition')}
          </div>
        </section>

        {#if snapshot && snapshot.attention.length > 0}
          <SectionCard
            title={$t('learning_analytics.attention_title')}
            description={$t('learning_analytics.attention_note')}
          >
            {#snippet action()}<Button
                variant="ghost"
                size="sm"
                href={`${$currentOrgPath}/employees`}
                class="ui:text-primary"
                >{$t('learning_analytics.employee_directory')}<ArrowRightIcon class="size-3.5" /></Button
              >{/snippet}
            <ul class="ui:divide-border divide-y">
              {#each snapshot.attention as employee (employee.id)}<li>
                  <a
                    href={`${$currentOrgPath}/employees?profileId=${employee.id}`}
                    class="ui:hover:bg-muted/50 flex flex-wrap items-center gap-3 rounded-lg py-3 transition-colors"
                    ><UserAvatar src={employee.avatarUrl} alt={employee.fullname} class="size-8" /><span
                      class="min-w-0 flex-1 text-sm font-medium">{employee.fullname}</span
                    >{#if employee.overdue}<Badge variant="warning"
                        >{$t('learning_analytics.overdue_count', { count: employee.overdue })}</Badge
                      >{:else if employee.assigned === 0}<Badge variant="outline"
                        >{$t('learning_analytics.unassigned')}</Badge
                      >{:else}<Badge variant="secondary"
                        >{$t('learning_analytics.not_started_count', { count: employee.notStarted })}</Badge
                      >{/if}<ArrowUpRightIcon class="ui:text-muted-foreground size-4" /></a
                  >
                </li>{/each}
            </ul>
          </SectionCard>
        {/if}
      {/if}
    {/snippet}
  </Page.Body>
</Page.Root>

<style>
  .metric-icon {
    display: grid;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    place-items: center;
    border-radius: 0.6rem;
    background: var(--info-soft);
    color: var(--info-foreground);
  }
  .metric-icon[data-tone='success'] {
    background: var(--success-soft);
    color: var(--success-foreground);
  }
  .metric-icon[data-tone='warning'] {
    background: var(--warning-soft);
    color: var(--warning-foreground);
  }
</style>

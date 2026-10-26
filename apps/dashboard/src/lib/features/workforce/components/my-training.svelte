<script lang="ts">
  import { t } from '$lib/utils/functions/translations';
  import type { WorkforceApi } from '../api/workforce.svelte';
  let { api }: { api: WorkforceApi } = $props();
</script>

<div class="space-y-6">
  {#each api.assignments?.paths ?? [] as path (path.id)}
    <section class="rounded-xl border p-5">
      <h2 class="text-lg font-semibold">{path.name}</h2>
      <ol class="mt-4 space-y-3">
        {#each path.courses as course (course.id)}<li
            class="flex items-center justify-between gap-4 rounded-lg border p-3"
          >
            <a class="ui:text-primary underline" href={`/courses/${course.courseId}`}
              >{course.position + 1}. {course.title}</a
            ><span class="text-sm">{$t(course.complete ? 'workforce.completed' : 'workforce.remaining')}</span>
          </li>{/each}
      </ol>
    </section>
  {/each}
  <section class="space-y-3 rounded-xl border p-5">
    <h2 class="text-lg font-semibold">{$t('workforce.assigned_training')}</h2>
    {#each api.assignments?.assignments.filter((row) => !row.assignment.pathId) ?? [] as row (row.assignment.id)}
      <div class="flex items-center justify-between gap-4 border-t py-3">
        <a
          class="ui:text-primary underline"
          href={row.assignment.examId
            ? `/courses/${row.examCourseId}/exercises/${row.assignment.examId}`
            : `/courses/${row.assignment.courseId}`}>{row.examTitle ?? row.courseTitle}</a
        ><span class="text-sm">{$t(row.complete ? 'workforce.completed' : 'workforce.remaining')}</span>
      </div>
    {:else}<p class="ui:text-muted-foreground text-sm">{$t('workforce.no_assignments')}</p>{/each}
  </section>
</div>

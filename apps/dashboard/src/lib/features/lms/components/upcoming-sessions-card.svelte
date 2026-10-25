<script lang="ts">
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { Button } from '@cio/ui/base/button';
  import RadioIcon from '@lucide/svelte/icons/radio';
  import ClockIcon from '@lucide/svelte/icons/clock';
  import VideoIcon from '@lucide/svelte/icons/video';
  import { t } from '$lib/utils/functions/translations';

  interface SessionItem {
    lessonId: string;
    courseTitle: string;
    lessonTitle: string;
    callUrl: string;
    lessonAt: string;
    timezone?: string | null;
  }

  let { sessions }: { sessions: SessionItem[] } = $props();

  function dateLabel(iso: string, tz?: string | null): string {
    try {
      return new Intl.DateTimeFormat(getIntlLocale(), {
        timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toUTCString();
    }
  }
</script>

{#if sessions.length}
  <section class="ui:bg-card ui:text-card-foreground ui:shadow-card overflow-hidden rounded-xl border">
    <h3
      class="ui:bg-danger-soft ui:text-danger-foreground flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold"
    >
      <span class="relative flex size-2">
        <span class="ui:bg-danger absolute inline-flex size-full animate-ping rounded-full opacity-60"></span>
        <span class="ui:bg-danger relative inline-flex size-2 rounded-full"></span>
      </span>
      <RadioIcon class="custom size-4" />
      {$t('dashboard.upcoming_sessions_heading')}
    </h3>

    <ul class="ui:divide-border divide-y">
      {#each sessions as session (session.lessonId)}
        <li class="flex items-center justify-between gap-3 px-5 py-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-medium">{session.lessonTitle}</p>
            <p class="ui:text-muted-foreground mt-0.5 flex items-center gap-1.5 truncate text-xs">
              <ClockIcon size={12} class="shrink-0" />
              {dateLabel(session.lessonAt, session.timezone)} · {session.courseTitle}
            </p>
          </div>
          <Button size="sm" href={session.callUrl} target="_blank" rel="noreferrer" class="shrink-0">
            <VideoIcon size={14} />{$t('course.navItem.lessons.session.join')}
          </Button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

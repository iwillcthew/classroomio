<script lang="ts">
  import { getIntlLocale } from '$lib/utils/functions/intl-locale';
  import { DashboardPage } from '$features/lms/pages';
  import { getGreeting } from '$lib/utils/functions/date';
  import { t } from '$lib/utils/functions/translations';
  import { profile } from '$lib/utils/store/user';
  import { Button } from '@cio/ui/base/button';
  import LibraryBigIcon from '@lucide/svelte/icons/library-big';
  import * as Page from '@cio/ui/base/page';

  const todayLabel = new Intl.DateTimeFormat(getIntlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());
  const firstName = $derived($profile.fullname?.trim().split(/\s+/).at(-1) || $t('dashboard.learner'));
</script>

<svelte:head><title>{$t('lms_navigation.home')} · MP Learning</title></svelte:head>

<Page.Root class="w-full">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Eyebrow class="first-letter:uppercase">{todayLabel}</Page.Eyebrow>
      <Page.Title>{$t(getGreeting())}, {firstName}</Page.Title>
      <Page.Subtitle>{$t('mp_workspace.welcome')}</Page.Subtitle>
    </Page.HeaderContent>
    <Page.Action
      ><Button variant="outline" size="sm" href="/lms/explore"
        ><LibraryBigIcon class="size-4" />{$t('page_titles.explore')}</Button
      ></Page.Action
    >
  </Page.Header>
  <Page.Body>{#snippet child()}<DashboardPage />{/snippet}</Page.Body>
</Page.Root>

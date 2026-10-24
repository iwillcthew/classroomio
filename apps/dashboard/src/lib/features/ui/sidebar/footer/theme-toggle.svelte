<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import { MonitorIcon, SunIcon, MoonIcon } from '@lucide/svelte';
  import { setMode, userPrefersMode } from '@cio/ui/base/dark-mode';

  import { markColorModeExplicit, type ColorModePreference } from '$lib/utils/functions/color-mode';
  import { t } from '$lib/utils/functions/translations';

  const themes: { mode: ColorModePreference; icon: typeof MonitorIcon; labelKey: string }[] = [
    { mode: 'light', icon: SunIcon, labelKey: 'landing.learner_menu.theme_light' },
    { mode: 'dark', icon: MoonIcon, labelKey: 'landing.learner_menu.theme_dark' },
    { mode: 'system', icon: MonitorIcon, labelKey: 'landing.learner_menu.theme_system' }
  ];

  const activeMode = $derived(userPrefersMode.current ?? 'light');

  const handleThemeChange = (newMode: ColorModePreference) => {
    markColorModeExplicit();
    setMode(newMode);
  };
</script>

<div class="flex items-center justify-between gap-8">
  <p>{$t('landing.learner_menu.theme')}</p>

  <div class="flex items-center gap-1 rounded-md backdrop-blur-sm">
    {#each themes as theme (theme.mode)}
      <Button
        size="icon-sm"
        variant={activeMode === theme.mode ? 'secondary' : 'ghost'}
        title={$t(theme.labelKey)}
        aria-label={$t(theme.labelKey)}
        onclick={() => handleThemeChange(theme.mode)}
      >
        <theme.icon class="size-4" />
      </Button>
    {/each}
  </div>
</div>

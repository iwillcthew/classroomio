<script lang="ts">
  import SunIcon from '@lucide/svelte/icons/sun';
  import MoonIcon from '@lucide/svelte/icons/moon';

  import { resetMode, setMode } from 'mode-watcher';
  import * as DropdownMenu from '../dropdown-menu';
  import { buttonVariants } from '../button';
  import { uiLabels } from '../../tools';
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger class={buttonVariants({ variant: 'outline', size: 'icon' })}>
    <SunIcon
      class="ui:h-[1.2rem] ui:w-[1.2rem] ui:rotate-0 ui:scale-100 ui:dark:-rotate-90 ui:dark:scale-0 !transition-all"
    />
    <MoonIcon
      class="ui:absolute ui:h-[1.2rem] ui:w-[1.2rem] ui:rotate-90 ui:scale-0 ui:dark:rotate-0 ui:dark:scale-100 !transition-all"
    />
    <span class="sr-only">{uiLabels.toggle_theme}</span>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onclick={() => setMode('light')}>{uiLabels.theme_light}</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => setMode('dark')}>{uiLabels.theme_dark}</DropdownMenu.Item>
    <DropdownMenu.Item onclick={() => resetMode()}>{uiLabels.theme_system}</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

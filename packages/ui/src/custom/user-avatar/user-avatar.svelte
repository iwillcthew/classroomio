<script lang="ts">
  import * as Avatar from '../../base/avatar';
  import { uiLabels } from '../../tools';

  interface Props {
    src?: string | null;
    alt?: string;
    class?: string;
    iconClass?: string;
  }

  let { src, alt = uiLabels.user, class: className = 'ui:size-6', iconClass = '' }: Props = $props();
</script>

<Avatar.Root class={className}>
  {#if src}
    <Avatar.Image {src} {alt} />
  {/if}
  <Avatar.Fallback>
    <img src="/images/avatar.svg" alt={uiLabels.user_avatar_alt} class={iconClass} />
  </Avatar.Fallback>
</Avatar.Root>

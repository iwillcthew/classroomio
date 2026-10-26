<script lang="ts">
  import { cn } from '@cio/ui/tools';

  interface Props {
    title: string;
    src?: string | null;
    class?: string;
    initialsClass?: string;
  }

  let { title, src, class: className = '', initialsClass = '' }: Props = $props();

  const COVER_PALETTES = [
    { background: '#e6edfc', ink: '#173f86', accent: '#7da5ef' },
    { background: '#e1f1ee', ink: '#16584e', accent: '#5fb5a4' },
    { background: '#ede8f8', ink: '#51417e', accent: '#b19bdd' },
    { background: '#f8eddd', ink: '#785125', accent: '#dfbb80' },
    { background: '#e1eef5', ink: '#215571', accent: '#7ab8d5' },
    { background: '#f5e6e4', ink: '#824d49', accent: '#d49b95' }
  ];

  function hashTitle(value: string) {
    let hash = 0;
    for (const character of value) {
      hash = (hash * 31 + character.charCodeAt(0)) | 0;
    }

    return Math.abs(hash);
  }

  function getInitials(value: string) {
    const words = value
      .replace(/[[\]():]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join('');
  }

  const hasImage = $derived(!!src?.trim());
  const palette = $derived(COVER_PALETTES[hashTitle(title) % COVER_PALETTES.length]);
  const initials = $derived(getInitials(title));
</script>

<div class={cn('relative overflow-hidden', className)}>
  {#if hasImage}
    <img {src} alt="" class="absolute inset-0 size-full object-cover" loading="lazy" />
  {:else}
    <div class="absolute inset-0" style:background-color={palette.background}></div>
    <svg
      class="absolute inset-0 size-full"
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <circle cx="142" cy="40" r="44" fill="none" stroke={palette.accent} stroke-width=".5" />
      <circle cx="142" cy="40" r="30" fill="none" stroke={palette.accent} stroke-width=".5" />
      <path d="M91 -10h29L85 100H56z" fill={palette.accent} fill-opacity=".38" />
      <path d="M123 -10h13L101 100H88z" fill={palette.ink} fill-opacity=".13" />
      <path d="M138 -10h30l-35 110h-30z" fill={palette.accent} fill-opacity=".22" />
      <circle cx="112" cy="9" r="3" fill={palette.ink} fill-opacity=".45" />
    </svg>
    <span
      class={cn('absolute bottom-3 left-3.5 text-2xl font-semibold tracking-tight', initialsClass)}
      style:color={palette.ink}
    >
      {initials}
    </span>
  {/if}
</div>

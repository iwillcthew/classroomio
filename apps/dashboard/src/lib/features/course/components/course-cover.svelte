<script lang="ts">
  import { cn } from '@cio/ui/tools';

  interface Props {
    title: string;
    src?: string | null;
    class?: string;
    initialsClass?: string;
  }

  let { title, src, class: className = '', initialsClass = '' }: Props = $props();

  const FACET_VARIANTS = [
    'linear-gradient(118deg, #0e2259 0%, #13398f 45%, #1559c6 72%, #0ea5e0 100%)',
    'linear-gradient(118deg, #0b2a5c 0%, #0b6cb5 55%, #0ea5e0 100%)',
    'linear-gradient(118deg, #14254d 0%, #1247a3 50%, #5b8fe6 100%)',
    'linear-gradient(118deg, #0e2259 0%, #0e7fb8 60%, #6cc9f2 100%)'
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
  const background = $derived(FACET_VARIANTS[hashTitle(title) % FACET_VARIANTS.length]);
  const initials = $derived(getInitials(title));
</script>

<div class={cn('relative overflow-hidden', className)}>
  {#if hasImage}
    <img {src} alt="" class="absolute inset-0 size-full object-cover" loading="lazy" />
  {:else}
    <div class="absolute inset-0" style:background-image={background}></div>
    <svg
      class="absolute inset-0 size-full"
      viewBox="0 0 160 90"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <path d="M88 -4 L116 -4 L80 94 L52 94 Z" fill="#ffffff" fill-opacity="0.12" />
      <path d="M116 -4 L136 -4 L100 94 L80 94 Z" fill="#ffffff" fill-opacity="0.2" />
      <path d="M136 -4 L170 -4 L170 20 L122 94 L100 94 Z" fill="#ffffff" fill-opacity="0.07" />
    </svg>
    <span
      class={cn(
        'absolute bottom-3 left-3.5 text-2xl font-semibold tracking-tight text-white/95 drop-shadow-sm',
        initialsClass
      )}
    >
      {initials}
    </span>
  {/if}
</div>

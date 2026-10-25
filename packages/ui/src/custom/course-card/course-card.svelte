<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import { cn } from '../../tools';
  import { Badge } from '../../base/badge';
  import { Separator } from '../../base/separator';
  import * as Item from '../../base/item';
  import { DEFAULT_COURSE_BANNER_IMAGE } from './constants';

  interface Props {
    href?: string;
    title: string;
    description: string;
    /** Used when `media` snippet is not provided */
    bannerImage?: string;
    bannerAlt?: string;
    typeBadge?: {
      label: string;
      icon: Component;
      iconClass?: string;
    };
    /** e.g. public-course indicator on the banner */
    visibilityBadge?: {
      label: string;
      icon: Component;
      iconClass?: string;
    };
    class?: string;
    /** Click handler for the card wrapper (e.g. opening a preview modal when `href` is absent) */
    onclick?: (event: MouseEvent) => void;
    /** Custom banner area (e.g. optimized `Image`); overrides `bannerImage` */
    media?: Snippet;
    /** Optional overlay outside the link (e.g. dropdown menu), typically absolutely positioned */
    overlay?: Snippet;
    tags?: Snippet;
    footer?: Snippet;
  }

  let {
    href,
    title,
    description,
    bannerImage,
    bannerAlt = 'Course banner image',
    typeBadge,
    visibilityBadge,
    class: className = '',
    onclick,
    media,
    overlay,
    tags,
    footer
  }: Props = $props();

  const resolvedBannerImage = $derived(bannerImage?.trim() ? bannerImage : DEFAULT_COURSE_BANNER_IMAGE);
</script>

<Item.Root
  variant="outline"
  class="ui:bg-card ui:shadow-card ui:h-full ui:w-full ui:overflow-hidden ui:rounded-xl! ui:p-0! ui:transition-[box-shadow,border-color,transform] ui:hover:border-primary/40 ui:hover:shadow-raised"
  {onclick}
>
  {#snippet child({ props })}
    <div class={cn('ui:group ui:relative ui:flex ui:h-full ui:w-full ui:flex-col', className)}>
      {@render overlay?.()}

      {#if href}
        <a
          {href}
          {...props}
          class={cn(props.class as string, 'ui:flex ui:h-full ui:flex-col ui:flex-nowrap ui:items-stretch ui:gap-0')}
        >
          <Item.Header class="ui:basis-auto">
            <Item.Media variant="image" class="ui:relative ui:aspect-video ui:h-auto! ui:w-full! ui:rounded-none!">
              {#if media}
                {@render media()}
              {:else}
                <img
                  src={resolvedBannerImage}
                  alt={bannerAlt}
                  class="ui:w-full ui:h-full ui:object-cover ui:transition-transform ui:duration-300 ui:group-hover:scale-[1.02]"
                />
              {/if}

              {#if typeBadge}
                {@const Icon = typeBadge.icon}
                <Badge
                  class="ui:bg-card/95 ui:text-foreground ui:absolute ui:top-3 ui:left-3 ui:z-10 ui:flex ui:items-center ui:shadow-sm ui:backdrop-blur"
                  variant="outline"
                >
                  <Icon class={typeBadge.iconClass} />
                  {typeBadge.label}
                </Badge>
              {/if}

              {#if visibilityBadge}
                {@const VIcon = visibilityBadge.icon}
                <Badge
                  class={cn(
                    'ui:bg-card/95 ui:text-foreground ui:absolute ui:top-3 ui:z-10 ui:flex ui:items-center ui:gap-1 ui:shadow-sm ui:backdrop-blur',
                    typeBadge ? 'ui:right-3 ui:left-auto' : 'ui:left-3'
                  )}
                  variant="outline"
                >
                  <VIcon class={visibilityBadge.iconClass} />
                  {visibilityBadge.label}
                </Badge>
              {/if}
            </Item.Media>
          </Item.Header>

          <Item.Content class="ui:flex ui:min-w-0 ui:flex-1 ui:flex-col ui:gap-1.5 ui:p-4">
            <Item.Title
              class="ui:flex ui:min-h-12 ui:items-start ui:text-base! ui:font-semibold ui:leading-snug ui:wrap-anywhere"
            >
              <span class="ui:line-clamp-2">{title}</span>
            </Item.Title>

            <Item.Description class="ui:min-h-10 ui:line-clamp-2 ui:wrap-break-word">
              {description}
            </Item.Description>

            {#if tags}
              {@render tags()}
            {/if}

            {#if footer}
              <span class="ui:flex-1"></span><Separator class="ui:my-3" />
              {@render footer()}
            {/if}
          </Item.Content>
        </a>
      {:else}
        <div
          {...props}
          class={cn(props.class as string, 'ui:flex ui:h-full ui:flex-col ui:flex-nowrap ui:items-stretch ui:gap-0')}
        >
          <Item.Header class="ui:basis-auto">
            <Item.Media variant="image" class="ui:relative ui:aspect-video ui:h-auto! ui:w-full! ui:rounded-none!">
              {#if media}
                {@render media()}
              {:else}
                <img
                  src={resolvedBannerImage}
                  alt={bannerAlt}
                  class="ui:w-full ui:h-full ui:object-cover ui:transition-transform ui:duration-300 ui:group-hover:scale-[1.02]"
                />
              {/if}

              {#if typeBadge}
                {@const Icon = typeBadge.icon}
                <Badge
                  class="ui:bg-card/95 ui:text-foreground ui:absolute ui:top-3 ui:left-3 ui:z-10 ui:flex ui:items-center ui:shadow-sm ui:backdrop-blur"
                  variant="outline"
                >
                  <Icon class={typeBadge.iconClass} />
                  {typeBadge.label}
                </Badge>
              {/if}

              {#if visibilityBadge}
                {@const VIcon = visibilityBadge.icon}
                <Badge
                  class={cn(
                    'ui:bg-card/95 ui:text-foreground ui:absolute ui:top-3 ui:z-10 ui:flex ui:items-center ui:gap-1 ui:shadow-sm ui:backdrop-blur',
                    typeBadge ? 'ui:right-3 ui:left-auto' : 'ui:left-3'
                  )}
                  variant="outline"
                >
                  <VIcon class={visibilityBadge.iconClass} />
                  {visibilityBadge.label}
                </Badge>
              {/if}
            </Item.Media>
          </Item.Header>

          <Item.Content class="ui:flex ui:min-w-0 ui:flex-1 ui:flex-col ui:gap-1.5 ui:p-4">
            <Item.Title
              class="ui:flex ui:min-h-12 ui:items-start ui:text-base! ui:font-semibold ui:leading-snug ui:wrap-anywhere"
            >
              <span class="ui:line-clamp-2">{title}</span>
            </Item.Title>

            <Item.Description class="ui:min-h-10 ui:line-clamp-2 ui:wrap-break-word">
              {description}
            </Item.Description>

            {#if tags}
              {@render tags()}
            {/if}

            {#if footer}
              <span class="ui:flex-1"></span><Separator class="ui:my-3" />
              {@render footer()}
            {/if}
          </Item.Content>
        </div>
      {/if}
    </div>
  {/snippet}
</Item.Root>

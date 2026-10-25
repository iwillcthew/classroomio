<script lang="ts" module>
  import { tv, type VariantProps } from 'tailwind-variants';

  export const emptyMediaVariants = tv({
    base: 'ui:mb-2 ui:flex ui:shrink-0 ui:items-center ui:justify-center ui:[&_svg]:pointer-events-none ui:[&_svg]:shrink-0',
    variants: {
      variant: {
        default: 'ui:bg-transparent',
        icon: "ui:bg-accent ui:text-accent-foreground ui:ring-4 ui:ring-accent/40 ui:flex ui:size-11 ui:shrink-0 ui:items-center ui:justify-center ui:rounded-xl ui:[&_svg:not([class*='ui:size-'])]:size-5"
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  });

  export type EmptyMediaVariant = VariantProps<typeof emptyMediaVariants>['variant'];
</script>

<script lang="ts">
  import { cn, type WithElementRef } from '../../tools';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    ref = $bindable(null),
    class: className,
    children,
    variant = 'default',
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> & { variant?: EmptyMediaVariant } = $props();
</script>

<div
  bind:this={ref}
  data-slot="empty-icon"
  data-variant={variant}
  class={cn(emptyMediaVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</div>

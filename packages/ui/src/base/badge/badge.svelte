<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  export const badgeVariants = tv({
    base: 'ui:focus-visible:border-ring ui:focus-visible:ring-ring/50 ui:aria-invalid:ring-destructive/20 ui:dark:aria-invalid:ring-destructive/40 ui:aria-invalid:border-destructive ui:inline-flex ui:w-fit ui:shrink-0 ui:items-center ui:justify-center ui:gap-1 ui:overflow-hidden ui:whitespace-nowrap ui:rounded-full ui:border ui:px-2 ui:py-0.5 ui:text-xs ui:font-medium ui:transition-[color,box-shadow] ui:focus-visible:ring-[3px] ui:[&>svg]:pointer-events-none ui:[&>svg]:size-3',
    variants: {
      variant: {
        default: 'ui:bg-primary ui:text-primary-foreground ui:[a&]:hover:bg-primary/90 ui:border-transparent',
        secondary: 'ui:bg-secondary ui:text-secondary-foreground ui:[a&]:hover:bg-secondary/90 ui:border-transparent',
        destructive:
          'ui:bg-destructive ui:[a&]:hover:bg-destructive/90 ui:focus-visible:ring-destructive/20 ui:dark:focus-visible:ring-destructive/40 ui:dark:bg-destructive/70 ui:border-transparent ui:text-white',
        warning:
          'ui:bg-amber-50 ui:text-amber-700 ui:border-amber-200 ui:[a&]:hover:bg-amber-100 ui:dark:bg-amber-500/15 ui:dark:text-amber-300 ui:dark:border-amber-500/30',
        success:
          'ui:bg-emerald-50 ui:text-emerald-700 ui:border-emerald-200 ui:[a&]:hover:bg-emerald-100 ui:dark:bg-emerald-500/15 ui:dark:text-emerald-300 ui:dark:border-emerald-500/30',
        outline: 'ui:text-foreground ui:[a&]:hover:bg-accent ui:[a&]:hover:text-accent-foreground'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  });

  export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
  import type { HTMLAnchorAttributes } from 'svelte/elements';
  import { cn, type WithElementRef } from '../../tools';

  let {
    ref = $bindable(null),
    href,
    class: className,
    variant = 'default',
    children,
    ...restProps
  }: WithElementRef<HTMLAnchorAttributes> & {
    variant?: BadgeVariant;
  } = $props();
</script>

<svelte:element
  this={href ? 'a' : 'span'}
  bind:this={ref}
  data-slot="badge"
  {href}
  class={cn(badgeVariants({ variant }), className)}
  {...restProps}
>
  {@render children?.()}
</svelte:element>

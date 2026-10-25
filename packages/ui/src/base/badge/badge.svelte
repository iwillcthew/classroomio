<script lang="ts" module>
  import { type VariantProps, tv } from 'tailwind-variants';

  export const badgeVariants = tv({
    base: 'ui:focus-visible:border-ring ui:focus-visible:ring-ring/50 ui:aria-invalid:ring-destructive/20 ui:dark:aria-invalid:ring-destructive/40 ui:aria-invalid:border-destructive ui:inline-flex ui:w-fit ui:shrink-0 ui:items-center ui:justify-center ui:gap-1 ui:overflow-hidden ui:whitespace-nowrap ui:rounded-md ui:border ui:px-2 ui:py-0.5 ui:text-xs ui:font-medium ui:transition-[color,box-shadow] ui:focus-visible:ring-[3px] ui:[&>svg]:pointer-events-none ui:[&>svg]:size-3',
    variants: {
      variant: {
        default: 'ui:bg-primary ui:text-primary-foreground ui:[a&]:hover:bg-primary/90 ui:border-transparent',
        secondary: 'ui:bg-muted ui:text-muted-foreground ui:[a&]:hover:bg-secondary/90 ui:border-transparent',
        destructive:
          'ui:bg-danger-soft ui:text-danger-foreground ui:border-transparent ui:[a&]:hover:bg-danger-soft/80',
        warning: 'ui:bg-warning-soft ui:text-warning-foreground ui:border-transparent ui:[a&]:hover:bg-warning-soft/80',
        success: 'ui:bg-success-soft ui:text-success-foreground ui:border-transparent ui:[a&]:hover:bg-success-soft/80',
        info: 'ui:bg-info-soft ui:text-info-foreground ui:border-transparent ui:[a&]:hover:bg-info-soft/80',
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

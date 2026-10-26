<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { ScrollToTop } from '@cio/ui/custom/scroll-to-top';
  import { FIELDS } from './fields';

  const { Story } = defineMeta({
    title: 'Molecules/ScrollToTop',
    component: ScrollToTop,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen', controls: { include: FIELDS } },
    args: { label: 'Back to top' }
  });
</script>

<script lang="ts">
  let target = $state<HTMLElement | null>(null);
</script>

<Story name="Document scroll">
  {#snippet template(args)}
    <div class="p-8">
      <h1>Scroll one viewport to reveal the control</h1>
      <div class="h-[240vh]"></div>
    </div>
    <ScrollToTop {...args} />
  {/snippet}
</Story>

<Story name="Short content stays hidden">
  {#snippet template(args)}<div class="p-8">Short content has no floating control.</div>
    <ScrollToTop {...args} />{/snippet}
</Story>

<Story name="Nested scroll container">
  {#snippet template(args)}
    <div bind:this={target} class="m-8 h-80 overflow-y-auto border p-6">
      <h1>Scroll inside this container</h1>
      <div class="h-[1200px]"></div>
    </div>
    <ScrollToTop {...args} {target} />
  {/snippet}
</Story>

<Story name="Mobile navigation clearance" args={{ clearance: 'mobile-nav' }}>
  {#snippet template(args)}<div class="h-[240vh] p-8">Scroll down to see clearance above the footer.</div>
    <div class="fixed inset-x-0 bottom-0 border-t bg-white p-6">Mobile navigation</div>
    <ScrollToTop {...args} />{/snippet}
</Story>

<Story name="AI toolbar clearance" args={{ clearance: 'ask-ai' }}>
  {#snippet template(args)}<div class="h-[240vh] p-8">
      Scroll down to reveal the control. Use reduced motion in your OS to verify instant scrolling.
    </div>
    <ScrollToTop {...args} />{/snippet}
</Story>

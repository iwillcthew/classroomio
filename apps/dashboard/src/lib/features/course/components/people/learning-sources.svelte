<script lang="ts">
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import * as Dialog from '@cio/ui/base/dialog';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import { PeopleApi } from '$features/course/api/people.svelte';
  import type { CourseLearningSources } from '$features/course/utils/types';

  let {
    courseId,
    sources,
    compliance = false,
    learnerName = '',
    onChanged
  }: {
    courseId: string;
    sources: CourseLearningSources;
    compliance?: boolean;
    learnerName?: string;
    onChanged: () => void;
  } = $props();
  const api = new PeopleApi();
  let selectedSource = $state('');
  let detailsOpen = $state(false);
  const activeSources = $derived(sources.filter((source) => !source.revokedAt));
  const primarySource = $derived(
    activeSources.find((source) => source.kind !== 'LEGACY') ?? activeSources[0] ?? sources[0]
  );

  async function cancelSource() {
    const response = await api.revokeLearningSource(courseId, selectedSource);
    if (!response) return;

    selectedSource = '';
    onChanged();
  }
</script>

<button
  type="button"
  class="ui:hover:bg-muted ui:focus-visible:ring-ring flex w-full max-w-64 items-center justify-between gap-3 rounded-lg px-2 py-2 text-left focus-visible:ring-2 focus-visible:outline-none"
  onclick={() => (detailsOpen = true)}
  aria-label={`${$t('training_assignment.sources')}: ${learnerName}`}
>
  <span class="min-w-0 space-y-1">
    <span class="ui:text-foreground block truncate text-sm font-medium">
      {primarySource ? $t(`training_assignment.source.${primarySource.kind}`) : $t('training_assignment.no_sources')}
      {#if activeSources.length > 1}<span class="ui:text-muted-foreground ml-1 text-xs"
          >+{activeSources.length - 1}</span
        >{/if}
    </span>
    {#if sources.length && !activeSources.length}
      <span class="ui:text-muted-foreground block text-xs">{$t('training_assignment.cancelled')}</span>
    {/if}
    {#if primarySource?.name}<span class="ui:text-muted-foreground block truncate text-xs">{primarySource.name}</span
      >{/if}
    {#if activeSources.some((source) => source.required)}
      <span class="ui:text-primary block text-xs">{$t('training_assignment.required')}</span>
    {/if}
  </span>
  <ChevronRightIcon class="ui:text-muted-foreground size-4 shrink-0" />
</button>

<Dialog.Root bind:open={detailsOpen}>
  <Dialog.Content class="max-h-[85svh] overflow-y-auto sm:max-w-xl">
    <Dialog.Header>
      <Dialog.Title>{$t('training_assignment.sources')}</Dialog.Title>
      <Dialog.Description>{learnerName}</Dialog.Description>
    </Dialog.Header>
    <div class="space-y-3">
      {#each sources as source (`${source.kind}:${source.sourceId}`)}
        <div
          class:opacity-50={Boolean(source.revokedAt)}
          class="ui:border-border rounded-lg border p-4 text-sm leading-relaxed"
        >
          <p class="font-medium">{$t(`training_assignment.source.${source.kind}`)}</p>
          {#if source.name}<p>{source.name}</p>{/if}
          <p>{$t('training_assignment.created_at')}: {new Date(source.createdAt).toLocaleString()}</p>
          {#if source.revokedAt}
            <p>{$t('training_assignment.cancelled')}</p>
          {:else}
            <p>
              {$t(
                source.required
                  ? 'training_assignment.required'
                  : source.kind === 'DIRECT'
                    ? 'training_assignment.recommended'
                    : 'training_assignment.access_only'
              )}
            </p>
            {#if source.dueDate}<p>{new Date(source.dueDate).toLocaleString()}</p>{/if}
            {#if source.message}<p class="break-words whitespace-pre-wrap">{source.message}</p>{/if}
            {#if ['DIRECT', 'SELF', 'LEGACY'].includes(source.kind) && !compliance}
              <Button size="sm" variant="outline" onclick={() => (selectedSource = source.sourceId)}>
                {$t(source.kind === 'DIRECT' ? 'training_assignment.cancel' : 'training_assignment.revoke_access')}
              </Button>
            {/if}
          {/if}
        </div>
      {/each}
      {#if !sources.length}<p class="ui:text-muted-foreground">{$t('training_assignment.no_sources')}</p>{/if}
      {#if compliance}<p class="ui:text-muted-foreground">{$t('training_assignment.compliance_controls')}</p>{/if}
    </div>

    <Dialog.Root
      open={Boolean(selectedSource)}
      onOpenChange={(open) => {
        if (!open) selectedSource = '';
      }}
    >
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{$t('training_assignment.cancel')}</Dialog.Title>
          <Dialog.Description>{$t('training_assignment.cancel_hint')}</Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
          <Button size="sm" variant="outline" onclick={() => (selectedSource = '')}>{$t('common.cancel')}</Button>
          <Button size="sm" loading={api.isLoading} onclick={cancelSource}>{$t('training_assignment.cancel')}</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  </Dialog.Content>
</Dialog.Root>

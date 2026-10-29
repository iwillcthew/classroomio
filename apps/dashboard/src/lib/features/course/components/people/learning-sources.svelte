<script lang="ts">
  import * as Dialog from '@cio/ui/base/dialog';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import { PeopleApi } from '$features/course/api/people.svelte';
  import type { CourseLearningSources } from '$features/course/utils/types';

  let {
    courseId,
    sources,
    compliance = false,
    onChanged
  }: {
    courseId: string;
    sources: CourseLearningSources;
    compliance?: boolean;
    onChanged: () => void;
  } = $props();
  const api = new PeopleApi();
  let selectedSource = $state('');

  async function cancelSource() {
    const response = await api.revokeLearningSource(courseId, selectedSource);
    if (!response) return;

    selectedSource = '';
    onChanged();
  }
</script>

<div class="min-w-52 space-y-2">
  {#each sources as source (`${source.kind}:${source.sourceId}`)}
    <div class:opacity-50={Boolean(source.revokedAt)} class="rounded-md border p-2 text-xs">
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
        {#if source.message}<p class="max-w-64 whitespace-pre-wrap">{source.message}</p>{/if}
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

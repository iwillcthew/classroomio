<script lang="ts">
  import { Button } from '@cio/ui/base/button';
  import * as Dialog from '@cio/ui/base/dialog';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { t } from '$lib/utils/functions/translations';
  import EmployeeEditor from './employee-editor.svelte';
  import WorkforceFilters from './workforce-filters.svelte';
  import type { WorkforceApi } from '../api/workforce.svelte';
  import type { EmployeeRow } from '../utils/types';
  let { api }: { api: WorkforceApi } = $props();
  let statusEmployee = $state<EmployeeRow | null>(null);
  let nextStatus = $state<'ACTIVE' | 'SUSPENDED' | 'TERMINATED'>('SUSPENDED');
  let reason = $state('');
  const canManage = $derived(!!api.overview?.actor.canManage);
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between gap-3">
    <p class="ui:text-muted-foreground text-sm">
      {$t('workforce.employee_count', { count: api.overview?.employees.total ?? 0 })}
    </p>
    {#if canManage}<Button size="sm" onclick={() => api.openEmployee()} testId="employee-add"
        >{$t('workforce.add_employee')}</Button
      >{/if}
  </div>
  <WorkforceFilters {api} showStatus />
  <div class="overflow-x-auto rounded-lg border">
    <table class="w-full text-left text-sm">
      <thead class="ui:bg-muted"
        ><tr>
          <th class="p-3">{$t('workforce.employee_code')}</th><th class="p-3">{$t('workforce.fullname')}</th>
          <th class="p-3">{$t('workforce.unit')}</th><th class="p-3">{$t('workforce.job_title')}</th>
          <th class="p-3">{$t('workforce.direct_manager')}</th><th class="p-3">{$t('workforce.account_status')}</th><th
            class="p-3">{$t('workforce.actions')}</th
          >
        </tr></thead
      >
      <tbody>
        {#each api.overview?.employees.rows ?? [] as row (row.employee.id)}
          <tr class="border-t">
            <td class="p-3 font-medium">{row.employee.employeeCode}</td>
            <td class="p-3"
              ><p>{row.fullname}</p>
              <p class="ui:text-muted-foreground text-xs">{row.email}</p></td
            >
            <td class="p-3">{row.unit ?? $t('workforce.not_specified')}</td><td class="p-3"
              >{row.jobTitle ?? $t('workforce.not_specified')}</td
            >
            <td class="p-3"
              >{row.effectiveManagerName ??
                api.overview?.people.find((employee) => employee.id === row.effectiveManagerId)?.fullname ??
                $t('workforce.not_specified')}</td
            >
            <td class="p-3">{$t(`workforce.status.${row.employee.status}`)}</td>
            <td class="p-3"
              ><div class="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onclick={() => api.showHistory(row)}
                  >{$t('workforce.history')}</Button
                >
                {#if canManage}
                  <Button
                    size="sm"
                    variant="secondary"
                    onclick={() => api.openEmployee(row)}
                    testId={`employee-edit-${row.employee.employeeCode}`}>{$t('workforce.edit')}</Button
                  >
                  {#if ['DRAFT', 'PENDING'].includes(row.employee.status)}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={api.isLoading}
                      onclick={() => api.sendActivation(row.employee.id)}>{$t('workforce.send_activation')}</Button
                    >
                  {:else}
                    <Button
                      size="sm"
                      variant="outline"
                      onclick={() => {
                        statusEmployee = row;
                        nextStatus = row.employee.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                        reason = '';
                      }}>{$t(row.employee.status === 'ACTIVE' ? 'workforce.suspend' : 'workforce.reactivate')}</Button
                    >
                    {#if row.employee.status !== 'TERMINATED'}<Button
                        size="sm"
                        variant="outline"
                        onclick={() => {
                          statusEmployee = row;
                          nextStatus = 'TERMINATED';
                          reason = '';
                        }}>{$t('workforce.terminate')}</Button
                      >{/if}
                  {/if}
                {/if}
              </div></td
            >
          </tr>
        {:else}<tr><td colspan="7" class="p-8 text-center ui:text-muted-foreground">{$t('workforce.empty')}</td></tr
          >{/each}
      </tbody>
    </table>
  </div>
  <div class="flex justify-end gap-2">
    <Button
      variant="outline"
      size="sm"
      disabled={api.filters.page <= 1 || api.isLoading}
      onclick={() => api.changePage(-1)}>{$t('workforce.previous')}</Button
    >
    <span class="p-2 text-sm">{api.filters.page}</span>
    <Button
      variant="outline"
      size="sm"
      disabled={api.filters.page * api.filters.limit >= (api.overview?.employees.total ?? 0) || api.isLoading}
      onclick={() => api.changePage(1)}>{$t('workforce.next')}</Button
    >
  </div>
</div>
<EmployeeEditor {api} />
<Dialog.Root
  open={!!statusEmployee}
  onOpenChange={(open) => {
    if (!open) statusEmployee = null;
  }}
>
  <Dialog.Content>
    <Dialog.Header
      ><Dialog.Title>{$t(`workforce.status.${nextStatus}`)} · {statusEmployee?.fullname}</Dialog.Title
      ><Dialog.Description>{$t('workforce.status_description')}</Dialog.Description></Dialog.Header
    >
    <TextareaField label={$t('workforce.change_reason')} bind:value={reason} />
    <Dialog.Footer>
      <Button
        size="sm"
        variant="outline"
        onclick={() => {
          statusEmployee = null;
        }}>{$t('common.cancel')}</Button
      >
      <Button
        size="sm"
        disabled={api.isLoading || !reason.trim()}
        onclick={async () => {
          if (statusEmployee) await api.setStatus(statusEmployee, nextStatus, reason);
          if (!api.error) statusEmployee = null;
        }}>{$t('common.save_changes')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
<Dialog.Root
  open={!!api.historyEmployee}
  onOpenChange={(open) => {
    if (!open) api.historyEmployee = '';
  }}
>
  <Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header
      ><Dialog.Title>{$t('workforce.history')} · {api.historyEmployee}</Dialog.Title><Dialog.Description
        >{$t('workforce.history_description')}</Dialog.Description
      ></Dialog.Header
    >
    <ol class="space-y-4">
      {#each api.history ?? [] as event (event.id)}
        <li class="space-y-1 rounded-lg border p-3 text-sm">
          <p class="font-medium">{$t(`workforce.events.${event.event}`)}</p>
          <p class="ui:text-muted-foreground">{new Date(event.createdAt).toLocaleString()} · {event.actorName}</p>
          <p>{event.reason === event.event ? $t(`workforce.events.${event.event}`) : event.reason}</p>
          {#if event.event === 'UPDATED'}
            {@const before = event.changes.before as Record<string, string | null> | undefined}
            {@const after = event.changes.after as Record<string, string | null> | undefined}
            {#each ['unitId', 'jobTitleId', 'managerId', 'status', 'accessRole'] as field}
              {#if before?.[field] !== after?.[field] && after?.[field] !== undefined}
                <p>
                  {$t(`workforce.history_fields.${field}`)}:
                  {api.overview?.units.find((unit) => unit.id === before?.[field])?.name ??
                    api.overview?.jobTitles.find((title) => title.id === before?.[field])?.name ??
                    api.overview?.people.find((employee) => employee.id === before?.[field])?.fullname ??
                    (before?.[field]
                      ? $t(`workforce.${field === 'accessRole' ? 'roles' : 'status'}.${before[field]}`)
                      : $t('workforce.not_specified'))}
                  → {api.overview?.units.find((unit) => unit.id === after?.[field])?.name ??
                    api.overview?.jobTitles.find((title) => title.id === after?.[field])?.name ??
                    api.overview?.people.find((employee) => employee.id === after?.[field])?.fullname ??
                    (after?.[field]
                      ? $t(`workforce.${field === 'accessRole' ? 'roles' : 'status'}.${after[field]}`)
                      : $t('workforce.not_specified'))}
                </p>
              {/if}
            {/each}
          {/if}
        </li>
      {/each}
    </ol>
  </Dialog.Content>
</Dialog.Root>

<script lang="ts">
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Field from '@cio/ui/base/field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import WorkforceSelect from './workforce-select.svelte';
  import type { WorkforceApi } from '../api/workforce.svelte';
  let { api }: { api: WorkforceApi } = $props();
  const units = $derived((api.overview?.units ?? []).map((unit) => ({ value: unit.id, label: unit.name })));
  const titles = $derived((api.overview?.jobTitles ?? []).map((title) => ({ value: title.id, label: title.name })));
  const managers = $derived(
    (api.overview?.people ?? [])
      .filter((employee) => employee.status === 'ACTIVE' && employee.id !== api.employeeDraft.id)
      .map((employee) => ({ value: employee.id, label: `${employee.employeeCode} · ${employee.fullname}` }))
  );
  const roles = $derived(
    ['EMPLOYEE', 'HR', 'INSTRUCTOR'].map((role) => ({ value: role, label: $t(`workforce.roles.${role}`) }))
  );
  const defaultManager = $derived(
    api.overview?.people.find(
      (employee) => employee.id === api.overview?.units.find((unit) => unit.id === api.employeeDraft.unitId)?.leaderId
    )
  );
</script>

<Dialog.Root bind:open={api.employeeOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>{$t(api.employeeDraft.id ? 'workforce.edit_employee' : 'workforce.add_employee')}</Dialog.Title>
      <Dialog.Description>{$t('workforce.employee_description')}</Dialog.Description>
    </Dialog.Header>
    <Field.Group>
      <Field.Set>
        <Field.Legend>{$t('workforce.identity')}</Field.Legend>
        <Field.Group class="grid gap-4 sm:grid-cols-2">
          <InputField
            label={$t('workforce.employee_code')}
            bind:value={api.employeeDraft.employeeCode}
            isDisabled={!!api.employeeDraft.id}
            helperMessage={$t('workforce.code_immutable')}
            testId="employee-code"
          />
          <InputField
            label={$t('workforce.fullname')}
            bind:value={api.employeeDraft.fullname}
            testId="employee-fullname"
          />
          <InputField
            label={$t('workforce.email')}
            type="email"
            bind:value={api.employeeDraft.email}
            isDisabled={!!api.employeeDraft.id}
            testId="employee-email"
          />
          <WorkforceSelect
            label={$t('workforce.access_role')}
            bind:value={api.employeeDraft.accessRole}
            options={roles}
          />
        </Field.Group>
      </Field.Set>
      <Field.Separator />
      <Field.Set>
        <Field.Legend>{$t('workforce.organization_structure')}</Field.Legend>
        <Field.Group class="grid gap-4 sm:grid-cols-2">
          <WorkforceSelect label={$t('workforce.unit')} bind:value={api.employeeDraft.unitId} options={units} />
          <WorkforceSelect
            label={$t('workforce.job_title')}
            bind:value={api.employeeDraft.jobTitleId}
            options={titles}
          />
          <WorkforceSelect
            label={$t('workforce.direct_manager')}
            bind:value={api.employeeDraft.managerId}
            options={managers}
          />
        </Field.Group>
        <Field.Description
          >{$t('workforce.manager_default')}{#if defaultManager}
            · {defaultManager.fullname}{/if}</Field.Description
        >
      </Field.Set>
      {#if api.employeeDraft.id}
        <Field.Separator />
        <TextareaField label={$t('workforce.change_reason')} bind:value={api.employeeDraft.reason} />
      {/if}
    </Field.Group>
    {#if api.error}<p role="alert" class="ui:text-destructive text-sm">{$t(api.errorKey)}</p>{/if}
    <Dialog.Footer>
      {#if !api.employeeDraft.id}
        <Button
          size="sm"
          variant="secondary"
          disabled={api.isLoading}
          onclick={() => api.saveEmployee(false)}
          testId="employee-save-draft">{$t('workforce.save_draft')}</Button
        >
      {/if}
      <Button
        size="sm"
        variant="outline"
        onclick={() => {
          api.employeeOpen = false;
        }}
        testId="employee-editor-cancel">{$t('common.cancel')}</Button
      >
      <Button
        size="sm"
        loading={api.isLoading}
        disabled={api.isLoading}
        onclick={() => api.saveEmployee(!api.employeeDraft.id)}
        testId="employee-save"
        >{$t(api.employeeDraft.id ? 'common.save_changes' : 'workforce.create_and_activate')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

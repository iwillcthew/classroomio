<script lang="ts">
  import * as Field from '@cio/ui/base/field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { CheckboxField } from '@cio/ui/custom/checkbox-field';
  import { Input } from '@cio/ui/base/input';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import WorkforceSelect from './workforce-select.svelte';
  import WorkforceFilters from './workforce-filters.svelte';
  import type { WorkforceApi } from '../api/workforce.svelte';
  let { api }: { api: WorkforceApi } = $props();
  const leaders = $derived(
    (api.overview?.people ?? [])
      .filter((employee) => employee.status === 'ACTIVE')
      .map((employee) => ({ value: employee.id, label: `${employee.employeeCode} · ${employee.fullname}` }))
  );
  const units = $derived(
    (api.overview?.units ?? []).filter(
      (unit) =>
        (!api.filters.unitId || unit.id === api.filters.unitId) &&
        `${unit.name} ${unit.code}`.toLowerCase().includes(api.filters.search.toLowerCase())
    )
  );
  const titles = $derived(
    (api.overview?.jobTitles ?? []).filter(
      (title) =>
        (!api.filters.jobTitleId || title.id === api.filters.jobTitleId) &&
        `${title.name} ${title.code}`.toLowerCase().includes(api.filters.search.toLowerCase())
    )
  );
</script>

<div class="space-y-6">
  <WorkforceFilters {api} />
  <div class="grid gap-6 lg:grid-cols-2">
    <section class="space-y-4 rounded-xl border p-5">
      <h2 class="text-lg font-semibold">{$t('workforce.units')}</h2>
      <p class="ui:text-muted-foreground text-sm">{$t('workforce.unit_description')}</p>
      <Field.Group>
        <InputField label={$t('workforce.code')} bind:value={api.unitDraft.code} />
        <InputField label={$t('workforce.name')} bind:value={api.unitDraft.name} />
        <WorkforceSelect label={$t('workforce.unit_leader')} bind:value={api.unitDraft.leaderId} options={leaders} />
      </Field.Group>
      <Button
        size="sm"
        loading={api.isLoading}
        disabled={api.isLoading}
        onclick={() => api.saveUnit()}
        testId="workforce-unit-save">{$t('common.save_changes')}</Button
      >
      <ul class="divide-y">
        {#each units as unit (unit.id)}
          <li class="flex items-center justify-between gap-3 py-3">
            <div>
              <p class="font-medium">{unit.code} · {unit.name}</p>
              <p class="ui:text-muted-foreground text-sm">
                {api.overview?.people.find((employee) => employee.id === unit.leaderId)?.fullname}
              </p>
            </div>
            <Button size="sm" variant="secondary" onclick={() => Object.assign(api.unitDraft, unit)}
              >{$t('workforce.edit')}</Button
            >
          </li>
        {/each}
      </ul>
    </section>
    <section class="space-y-4 rounded-xl border p-5">
      <h2 class="text-lg font-semibold">{$t('workforce.job_titles')}</h2>
      <Field.Group>
        <InputField label={$t('workforce.code')} bind:value={api.titleDraft.code} />
        <InputField label={$t('workforce.name')} bind:value={api.titleDraft.name} />
      </Field.Group>
      <Button
        size="sm"
        loading={api.isLoading}
        disabled={api.isLoading}
        onclick={() => api.saveTitle()}
        testId="workforce-title-save">{$t('common.save_changes')}</Button
      >
      <ul class="divide-y">
        {#each titles as title (title.id)}
          <li class="flex items-center justify-between gap-3 py-3">
            <span>{title.code} · {title.name}</span><Button
              size="sm"
              variant="secondary"
              onclick={() => Object.assign(api.titleDraft, title)}>{$t('workforce.edit')}</Button
            >
          </li>
        {/each}
      </ul>
    </section>
  </div>
  <section class="space-y-4 rounded-xl border p-5">
    <h2 class="text-lg font-semibold">{$t('workforce.import_employees')}</h2>
    <p class="ui:text-muted-foreground text-sm">{$t('workforce.import_description')}</p>
    <Button size="sm" variant="outline" onclick={() => api.downloadCsv('template')}
      >{$t('workforce.download_template')}</Button
    >
    <Field.Field
      ><Field.Label for="employee-import-file">{$t('workforce.csv_file')}</Field.Label><Input
        id="employee-import-file"
        type="file"
        accept=".csv,text/csv"
        onchange={(event) => api.readImportFile(event)}
      /></Field.Field
    >
    <TextareaField label={$t('workforce.paste_csv')} bind:value={api.importCsv} oninput={() => api.reviewImport()} />
    <CheckboxField
      label={$t('workforce.send_activation')}
      bind:checked={api.importSendActivation}
      onchange={() => api.reviewImport()}
    />
    {#if api.importRows.length}
      <div class="max-h-64 overflow-auto rounded-lg border">
        <table class="w-full text-left text-sm">
          <thead class="ui:bg-muted"
            ><tr
              ><th class="p-2">{$t('workforce.row')}</th><th class="p-2">{$t('workforce.employee_code')}</th><th
                class="p-2">{$t('workforce.result')}</th
              ></tr
            ></thead
          ><tbody>
            {#each api.importRows as row (row.row)}<tr class="border-t"
                ><td class="p-2">{row.row}</td><td class="p-2">{row.employeeCode}</td><td class="p-2"
                  >{$t(row.error ?? 'workforce.ready')}</td
                ></tr
              >{/each}
          </tbody>
        </table>
      </div>
      <Button
        size="sm"
        loading={api.isLoading}
        disabled={api.isLoading || !api.importRows.some((row) => row.data)}
        onclick={() => api.importEmployees()}
        testId="workforce-import">{$t('workforce.import_ready')}</Button
      >
    {/if}
    {#if api.importResults}
      <ul class="space-y-1 text-sm">
        {#each api.importResults as result (result.employeeCode)}<li>
            {result.employeeCode} · {$t(
              result.success ? 'workforce.saved' : 'workforce.errors.import_row'
            )}{#if api.activationWasNotQueued(result)}
              · {$t('workforce.activation_not_queued')}{/if}
          </li>{/each}
      </ul>
    {/if}
  </section>
</div>

<script lang="ts">
  import * as Field from '@cio/ui/base/field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { CheckboxField } from '@cio/ui/custom/checkbox-field';
  import { Button } from '@cio/ui/base/button';
  import { t } from '$lib/utils/functions/translations';
  import WorkforceSelect from './workforce-select.svelte';
  import WorkforcePicker from './workforce-picker.svelte';
  import WorkforceFilters from './workforce-filters.svelte';
  import type { WorkforceApi } from '../api/workforce.svelte';
  let { api }: { api: WorkforceApi } = $props();
  const units = $derived((api.overview?.units ?? []).map((unit) => ({ value: unit.id, label: unit.name })));
  const titles = $derived((api.overview?.jobTitles ?? []).map((title) => ({ value: title.id, label: title.name })));
  const courses = $derived((api.overview?.courses ?? []).map((course) => ({ value: course.id, label: course.title })));
  const exams = $derived((api.overview?.exams ?? []).map((exam) => ({ value: exam.id, label: exam.title })));
  const paths = $derived((api.overview?.paths ?? []).map((path) => ({ value: path.id, label: path.name })));
  const visibleRules = $derived(
    (api.overview?.rules ?? []).filter(
      (rule) =>
        (!api.filters.unitId || rule.unitId === api.filters.unitId) &&
        (!api.filters.jobTitleId || rule.jobTitleId === api.filters.jobTitleId) &&
        rule.name.toLowerCase().includes(api.filters.search.toLowerCase())
    )
  );
  const visiblePaths = $derived(
    (api.overview?.paths ?? []).filter(
      (path) =>
        (!api.filters.jobTitleId || path.jobTitleId === api.filters.jobTitleId) &&
        path.name.toLowerCase().includes(api.filters.search.toLowerCase())
    )
  );
</script>

<div class="space-y-6">
  <WorkforceFilters {api} />
  <section class="space-y-4 rounded-xl border p-5">
    <h2 class="text-lg font-semibold">{$t('workforce.training_rules')}</h2>
    <p class="ui:text-muted-foreground text-sm">{$t('workforce.rule_description')}</p>
    <Field.Group>
      <Field.Set>
        <Field.Legend>{$t('workforce.target_audience')}</Field.Legend>
        <Field.Group class="grid gap-4 md:grid-cols-3">
          <InputField label={$t('workforce.name')} bind:value={api.ruleDraft.name} />
          <WorkforceSelect label={$t('workforce.unit')} bind:value={api.ruleDraft.unitId} options={units} />
          <WorkforceSelect label={$t('workforce.job_title')} bind:value={api.ruleDraft.jobTitleId} options={titles} />
        </Field.Group>
        <CheckboxField label={$t('workforce.rule_enabled')} bind:checked={api.ruleDraft.enabled} />
      </Field.Set>
      <Field.Separator />
      <Field.Set>
        <Field.Legend>{$t('workforce.training_content')}</Field.Legend>
        <div class="grid gap-4 lg:grid-cols-3">
          <WorkforcePicker label={$t('workforce.courses')} options={courses} bind:selected={api.ruleDraft.courseIds} />
          <WorkforcePicker label={$t('workforce.exams')} options={exams} bind:selected={api.ruleDraft.examIds} />
          <WorkforcePicker
            label={$t('workforce.learning_paths')}
            options={paths}
            bind:selected={api.ruleDraft.pathIds}
          />
        </div>
        <Field.Description>{$t('workforce.exam_access_hint')}</Field.Description>
      </Field.Set>
    </Field.Group>
    <Button
      size="sm"
      loading={api.isLoading}
      disabled={api.isLoading}
      onclick={() => api.saveRule()}
      testId="workforce-rule-save">{$t('workforce.save_and_apply')}</Button
    >
    <ul class="divide-y">
      {#each visibleRules as rule (rule.id)}
        <li class="flex items-center justify-between gap-3 py-3">
          <div>
            <p class="font-medium">{rule.name}</p>
            <p class="ui:text-muted-foreground text-sm">
              {rule.enabled ? $t('workforce.enabled') : $t('workforce.disabled')} · {units.find(
                (unit) => unit.value === rule.unitId
              )?.label ?? $t('workforce.all_units')} · {titles.find((title) => title.value === rule.jobTitleId)
                ?.label ?? $t('workforce.all_titles')}
            </p>
          </div>
          <Button size="sm" variant="secondary" onclick={() => api.editRule(rule.id)}>{$t('workforce.edit')}</Button>
        </li>
      {/each}
    </ul>
  </section>
  <section class="space-y-4 rounded-xl border p-5">
    <h2 class="text-lg font-semibold">{$t('workforce.learning_paths')}</h2>
    <p class="ui:text-muted-foreground text-sm">{$t('workforce.path_description')}</p>
    <Field.Group class="grid gap-4 sm:grid-cols-2">
      <InputField label={$t('workforce.name')} bind:value={api.pathDraft.name} />
      <WorkforceSelect label={$t('workforce.job_title')} bind:value={api.pathDraft.jobTitleId} options={titles} />
    </Field.Group>
    <WorkforcePicker
      label={$t('workforce.courses')}
      options={courses}
      bind:selected={api.pathDraft.courseIds}
      ordered
    />
    <Button
      size="sm"
      loading={api.isLoading}
      disabled={api.isLoading}
      onclick={() => api.savePath()}
      testId="workforce-path-save">{$t('workforce.save_and_apply')}</Button
    >
    <ul class="divide-y">
      {#each visiblePaths as path (path.id)}<li class="flex items-center justify-between gap-3 py-3">
          <div>
            <p class="font-medium">{path.name}</p>
            <p class="ui:text-muted-foreground text-sm">
              {titles.find((title) => title.value === path.jobTitleId)?.label}
            </p>
          </div>
          <Button size="sm" variant="secondary" onclick={() => api.editPath(path.id)}>{$t('workforce.edit')}</Button>
        </li>{/each}
    </ul>
  </section>
</div>

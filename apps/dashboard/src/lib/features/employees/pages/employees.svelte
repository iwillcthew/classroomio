<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { EmployeesApi } from '../api/employees.svelte';
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { EMPLOYEE_ROLES, EMPLOYEE_STATUSES, type EmployeeStatus } from '@cio/utils/validation/organization';
  import * as Page from '@cio/ui/base/page';
  import * as Field from '@cio/ui/base/field';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as Select from '@cio/ui/base/select';
  import * as Table from '@cio/ui/base/table';
  import { Input } from '@cio/ui/base/input';
  import { Textarea } from '@cio/ui/base/textarea';
  import { Checkbox } from '@cio/ui/base/checkbox';
  import { Button } from '@cio/ui/base/button';
  import { Skeleton } from '@cio/ui/base/skeleton';

  const api = new EmployeesApi();
  let loadedOrgId = '';
  const search = new DebouncedSearch({
    onApply: (value) => {
      api.search = value;
      api.page = 1;
      void api.load();
    }
  });
  const department = new DebouncedSearch({
    onApply: (value) => {
      api.department = value;
      api.page = 1;
      void api.load();
    }
  });
  const roles = $derived(
    api.roster?.access.role === 'ADMIN'
      ? EMPLOYEE_ROLES
      : EMPLOYEE_ROLES.filter((role) => role === 'EMPLOYEE' || role === 'MANAGER')
  );
  const canManage = $derived(api.roster?.access.canManage ?? false);

  $effect(() => {
    const orgId = $currentOrg.id;
    if (!orgId || loadedOrgId === orgId) return;

    loadedOrgId = orgId;
    untrack(() => {
      api.roster = null;
      api.options = null;
      api.details = null;
      api.editorOpen = false;
      api.detailOpen = false;
      api.message = '';
      void api.load();
    });
  });
  onDestroy(() => {
    search.destroy();
    department.destroy();
  });

  function filterStatus(value: string) {
    api.status = value === 'ALL' ? '' : (value as EmployeeStatus);
    api.page = 1;
    void api.load();
  }

  async function openImport() {
    await api.loadOptions();
    api.importRows = [];
    api.importResult = null;
    api.importCourseIds = [];
    api.importCohortIds = [];
    api.importSend = true;
    api.message = '';
    api.importOpen = true;
  }
</script>

<svelte:head><title>{$t('employees.title')} · MP Learning</title></svelte:head>

<Page.Root class="mx-auto w-full max-w-6xl">
  <Page.Header>
    <Page.HeaderContent>
      <Page.Title>{$t('employees.title')}</Page.Title>
      <Page.Subtitle>{$t('employees.subtitle')}</Page.Subtitle>
    </Page.HeaderContent>
    {#if api.roster}
      <Page.Action>
        <Button variant="secondary" disabled={api.exporting || api.isLoading} onclick={() => api.exportEmployees()}
          >{$t('employees.export')}</Button
        >
        {#if canManage}
          <Button variant="secondary" onclick={openImport} disabled={api.isLoading}>{$t('employees.import')}</Button>
          <Button onclick={() => api.openCreate()} disabled={api.isLoading} testId="employee-create"
            >{$t('employees.add')}</Button
          >
        {/if}
      </Page.Action>
    {/if}
  </Page.Header>
  <Page.Body>
    {#snippet child()}
      <div class="space-y-5">
        {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
        {#if !api.roster && !api.message}
          {#each [0, 1, 2] as index (index)}<Skeleton class="h-20 w-full" />{/each}
        {:else if api.roster}
          <div class="grid gap-3 sm:grid-cols-3">
            <Field.Field
              ><Field.Label for="employee-search">{$t('employees.search')}</Field.Label><Input
                id="employee-search"
                value={search.draft}
                oninput={(event) => search.input(event.currentTarget.value)}
              /></Field.Field
            >
            <Field.Field
              ><Field.Label for="employee-department-filter">{$t('employees.department')}</Field.Label><Input
                id="employee-department-filter"
                value={department.draft}
                oninput={(event) => department.input(event.currentTarget.value)}
              /></Field.Field
            >
            <Field.Field>
              <Field.Label>{$t('employees.status_label')}</Field.Label>
              <Select.Root type="single" value={api.status || 'ALL'} onValueChange={filterStatus}>
                <Select.Trigger class="w-full"
                  >{$t(api.status ? `employees.status.${api.status}` : 'employees.all')}</Select.Trigger
                >
                <Select.Content
                  ><Select.Item value="ALL">{$t('employees.all')}</Select.Item
                  >{#each EMPLOYEE_STATUSES as status (status)}<Select.Item value={status}
                      >{$t(`employees.status.${status}`)}</Select.Item
                    >{/each}</Select.Content
                >
              </Select.Root>
            </Field.Field>
          </div>
          <div class="ui:border-border overflow-x-auto rounded-lg border">
            <Table.Root>
              <Table.Header
                ><Table.Row>
                  <Table.Head>{$t('employees.code')}</Table.Head><Table.Head>{$t('employees.name')}</Table.Head
                  ><Table.Head>{$t('employees.department')}</Table.Head><Table.Head
                    >{$t('employees.role_label')}</Table.Head
                  ><Table.Head>{$t('employees.status_label')}</Table.Head><Table.Head
                    >{$t('employees.actions')}</Table.Head
                  >
                </Table.Row></Table.Header
              >
              <Table.Body>
                {#each api.roster.rows as staff (staff.id)}
                  <Table.Row>
                    <Table.Cell class="font-medium">{staff.employeeCode}</Table.Cell>
                    <Table.Cell
                      ><div>{staff.fullname}</div>
                      <div class="ui:text-muted-foreground text-xs">{staff.email}</div></Table.Cell
                    >
                    <Table.Cell
                      ><div>{staff.department}</div>
                      <div class="ui:text-muted-foreground text-xs">{staff.jobTitle}</div></Table.Cell
                    >
                    <Table.Cell>{$t(`employees.role.${staff.role}`)}</Table.Cell>
                    <Table.Cell>{$t(`employees.status.${staff.status}`)}</Table.Cell>
                    <Table.Cell>
                      <div class="flex flex-wrap gap-1">
                        <Button size="sm" variant="secondary" disabled={api.isLoading} onclick={() => api.view(staff)}
                          >{$t('employees.details')}</Button
                        >
                        {#if canManage}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={api.isLoading}
                            onclick={() => api.openEdit(staff)}>{$t('employees.edit')}</Button
                          >
                          {#if staff.status === 'DRAFT' || staff.status === 'INVITED'}<Button
                              size="sm"
                              variant="outline"
                              disabled={api.isLoading}
                              onclick={() => api.resend(staff)}>{$t('employees.send')}</Button
                            >{/if}
                          {#if staff.status === 'ACTIVE'}<Button
                              size="sm"
                              variant="outline"
                              onclick={() => api.openStatus(staff, 'SUSPENDED')}>{$t('employees.suspend')}</Button
                            >{/if}
                          {#if staff.status === 'SUSPENDED' || staff.status === 'LEFT'}<Button
                              size="sm"
                              variant="outline"
                              onclick={() => api.openStatus(staff, 'ACTIVE')}>{$t('employees.restore')}</Button
                            >{/if}
                          {#if staff.status !== 'LEFT'}<Button
                              size="sm"
                              variant="outline"
                              onclick={() => api.openStatus(staff, 'LEFT')}>{$t('employees.leave')}</Button
                            >{/if}
                        {/if}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {:else}<Table.Row
                    ><Table.Cell colspan={6} class="py-12 text-center">{$t('employees.empty')}</Table.Cell></Table.Row
                  >{/each}
              </Table.Body>
            </Table.Root>
          </div>
          <div class="flex items-center justify-between gap-3">
            <p class="ui:text-muted-foreground text-sm">{$t('employees.total', { count: api.roster.total })}</p>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={api.page <= 1 || api.isLoading}
                onclick={() => {
                  api.page--;
                  void api.load();
                }}>{$t('employees.previous')}</Button
              >
              <Button
                size="sm"
                variant="secondary"
                disabled={api.page * 25 >= api.roster.total || api.isLoading}
                onclick={() => {
                  api.page++;
                  void api.load();
                }}>{$t('employees.next')}</Button
              >
            </div>
          </div>
        {/if}
      </div>
    {/snippet}
  </Page.Body>
</Page.Root>

<Dialog.Root bind:open={api.editorOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header
      ><Dialog.Title>{$t(api.editingId ? 'employees.edit' : 'employees.add')}</Dialog.Title><Dialog.Description
        >{$t('employees.form_hint')}</Dialog.Description
      ></Dialog.Header
    >
    <Field.Group>
      <Field.Set>
        <Field.Legend>{$t('employees.identity')}</Field.Legend>
        <Field.Group class="grid gap-4 sm:grid-cols-2">
          <Field.Field
            ><Field.Label for="employee-code">{$t('employees.code')}</Field.Label><Input
              id="employee-code"
              bind:value={api.fields.employeeCode}
              disabled={!!api.editingId}
              maxlength={50}
              required
              data-testid="employee-code"
            /></Field.Field
          >
          <Field.Field
            ><Field.Label for="employee-fullname">{$t('employees.name')}</Field.Label><Input
              id="employee-fullname"
              bind:value={api.fields.fullname}
              required
              maxlength={200}
            /></Field.Field
          >
          <Field.Field class="sm:col-span-2"
            ><Field.Label for="employee-email">{$t('employees.email')}</Field.Label><Input
              id="employee-email"
              type="email"
              bind:value={api.fields.email}
              disabled={!!api.editingId}
              required
            /></Field.Field
          >
        </Field.Group>
      </Field.Set>
      <Field.Separator />
      <Field.Set>
        <Field.Legend>{$t('employees.organization')}</Field.Legend>
        <Field.Group class="grid gap-4 sm:grid-cols-2">
          <Field.Field
            ><Field.Label for="employee-department">{$t('employees.department')}</Field.Label><Input
              id="employee-department"
              bind:value={api.fields.department}
              maxlength={150}
            /></Field.Field
          >
          <Field.Field
            ><Field.Label for="employee-job">{$t('employees.job')}</Field.Label><Input
              id="employee-job"
              bind:value={api.fields.jobTitle}
              maxlength={150}
            /></Field.Field
          >
          <Field.Field
            ><Field.Label for="employee-start">{$t('employees.start')}</Field.Label><Input
              id="employee-start"
              type="date"
              bind:value={api.fields.startDate}
            /></Field.Field
          >
          <Field.Field>
            <Field.Label>{$t('employees.role_label')}</Field.Label>
            <Select.Root type="single" bind:value={api.fields.role}
              ><Select.Trigger class="w-full">{$t(`employees.role.${api.fields.role}`)}</Select.Trigger><Select.Content
                >{#each roles as role (role)}<Select.Item value={role}>{$t(`employees.role.${role}`)}</Select.Item
                  >{/each}</Select.Content
              ></Select.Root
            >
          </Field.Field>
          <Field.Field class="sm:col-span-2">
            <Field.Label>{$t('employees.manager')}</Field.Label>
            <Select.Root
              type="single"
              value={api.fields.managerId ?? 'none'}
              onValueChange={(value) => {
                api.fields.managerId = value === 'none' ? null : value;
              }}
            >
              <Select.Trigger class="w-full"
                >{api.options?.managers.find((manager) => manager.id === api.fields.managerId)?.fullname ??
                  $t('employees.none')}</Select.Trigger
              >
              <Select.Content
                ><Select.Item value="none">{$t('employees.none')}</Select.Item
                >{#each api.options?.managers.filter((manager) => manager.id !== api.editingId) ?? [] as manager (manager.id)}<Select.Item
                    value={manager.id}>{manager.employeeCode} · {manager.fullname}</Select.Item
                  >{/each}</Select.Content
              >
            </Select.Root>
          </Field.Field>
        </Field.Group>
      </Field.Set>
      <Field.Separator />
      <Field.Set
        ><Field.Legend>{$t('employees.learning')}</Field.Legend><Field.Description
          >{$t('employees.learning_hint')}</Field.Description
        >
        <Field.Group>
          {#each api.options?.courses ?? [] as course (course.id)}<Field.Field orientation="horizontal"
              ><Checkbox
                id={`employee-course-${course.id}`}
                checked={api.fields.courseIds.includes(course.id)}
                onCheckedChange={(checked) => {
                  api.fields.courseIds = checked
                    ? [...api.fields.courseIds, course.id]
                    : api.fields.courseIds.filter((courseId) => courseId !== course.id);
                }}
              /><Field.Label for={`employee-course-${course.id}`}>{course.title}</Field.Label></Field.Field
            >{/each}
          {#each api.options?.cohorts ?? [] as cohort (cohort.id)}<Field.Field orientation="horizontal"
              ><Checkbox
                id={`employee-cohort-${cohort.id}`}
                checked={api.fields.cohortIds.includes(cohort.id)}
                onCheckedChange={(checked) => {
                  api.fields.cohortIds = checked
                    ? [...api.fields.cohortIds, cohort.id]
                    : api.fields.cohortIds.filter((cohortId) => cohortId !== cohort.id);
                }}
              /><Field.Label for={`employee-cohort-${cohort.id}`}>{cohort.name}</Field.Label></Field.Field
            >{/each}
        </Field.Group>
      </Field.Set>
    </Field.Group>
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
    <Dialog.Footer>
      {#if !api.editingId}<Button size="sm" variant="secondary" disabled={api.isLoading} onclick={() => api.save(false)}
          >{$t('employees.draft')}</Button
        >{/if}
      <Button
        size="sm"
        variant="outline"
        disabled={api.isLoading}
        onclick={() => {
          api.editorOpen = false;
        }}>{$t('employees.cancel')}</Button
      >
      <Button
        size="sm"
        loading={api.isLoading}
        disabled={api.isLoading}
        onclick={() => api.save(!api.editingId)}
        testId="employee-save">{$t(api.editingId ? 'employees.save' : 'employees.create_send')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={api.importOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
    <Dialog.Header
      ><Dialog.Title>{$t('employees.import')}</Dialog.Title><Dialog.Description
        >{$t('employees.import_hint')}</Dialog.Description
      ></Dialog.Header
    >
    <Button size="sm" variant="secondary" onclick={() => api.downloadTemplate()}>{$t('employees.template')}</Button>
    <Field.Group>
      <Field.Field
        ><Field.Label for="employee-file">{$t('employees.file')}</Field.Label><Input
          id="employee-file"
          type="file"
          accept=".csv,.xlsx"
          disabled={api.isLoading}
          onchange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void api.readImport(file);
          }}
        /></Field.Field
      >
      <Field.Field orientation="horizontal"
        ><Checkbox
          id="employee-import-send"
          bind:checked={api.importSend}
          onCheckedChange={() => {
            api.importResult = null;
          }}
        /><Field.Label for="employee-import-send">{$t('employees.send_import')}</Field.Label></Field.Field
      >
      <Field.Set
        ><Field.Legend>{$t('employees.learning')}</Field.Legend>
        {#each api.options?.courses ?? [] as course (course.id)}<Field.Field orientation="horizontal"
            ><Checkbox
              id={`import-course-${course.id}`}
              checked={api.importCourseIds.includes(course.id)}
              onCheckedChange={(checked) => {
                api.importCourseIds = checked
                  ? [...api.importCourseIds, course.id]
                  : api.importCourseIds.filter((id) => id !== course.id);
                api.importResult = null;
              }}
            /><Field.Label for={`import-course-${course.id}`}>{course.title}</Field.Label></Field.Field
          >{/each}
        {#each api.options?.cohorts ?? [] as cohort (cohort.id)}<Field.Field orientation="horizontal"
            ><Checkbox
              id={`import-cohort-${cohort.id}`}
              checked={api.importCohortIds.includes(cohort.id)}
              onCheckedChange={(checked) => {
                api.importCohortIds = checked
                  ? [...api.importCohortIds, cohort.id]
                  : api.importCohortIds.filter((id) => id !== cohort.id);
                api.importResult = null;
              }}
            /><Field.Label for={`import-cohort-${cohort.id}`}>{cohort.name}</Field.Label></Field.Field
          >{/each}
      </Field.Set>
    </Field.Group>
    {#if api.importResult}
      <p class="text-sm">
        {$t(
          api.importing
            ? 'employees.import_running'
            : api.importResult.preview
              ? 'employees.preview'
              : 'employees.import_done'
        )}
      </p>
      <div class="max-h-64 overflow-auto">
        <Table.Root
          ><Table.Header
            ><Table.Row
              ><Table.Head>{$t('employees.row')}</Table.Head><Table.Head>{$t('employees.code')}</Table.Head><Table.Head
                >{$t('employees.result')}</Table.Head
              ></Table.Row
            ></Table.Header
          ><Table.Body
            >{#each api.importResult.rows as row (row.row)}<Table.Row
                ><Table.Cell>{row.row}</Table.Cell><Table.Cell>{row.employeeCode}</Table.Cell><Table.Cell
                  >{row.success
                    ? $t(
                        row.emailSent === false
                          ? 'employees.errors.email'
                          : api.importResult.preview
                            ? 'employees.ready'
                            : 'employees.saved'
                      )
                    : $t(row.message)}</Table.Cell
                ></Table.Row
              >{/each}</Table.Body
          ></Table.Root
        >
      </div>
      {#if api.importResult.rows.some((row) => !row.success)}<Button
          size="sm"
          variant="secondary"
          onclick={() => api.downloadFailures()}>{$t('employees.download_errors')}</Button
        >{/if}
    {/if}
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
    <Dialog.Footer>
      <Button
        size="sm"
        variant="secondary"
        disabled={!api.importRows.length || api.importing}
        onclick={() => api.runImport(true)}>{$t('employees.review')}</Button
      >
      <Button
        size="sm"
        variant="outline"
        disabled={api.importing}
        onclick={() => {
          api.importOpen = false;
        }}>{$t('employees.cancel')}</Button
      >
      <Button
        size="sm"
        loading={api.importing}
        disabled={!api.importResult?.preview || !api.importResult.rows.some((row) => row.success) || api.importing}
        onclick={() => api.runImport(false)}>{$t('employees.confirm_import')}</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={api.detailOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
    <Dialog.Header
      ><Dialog.Title>{api.details?.employee.fullname}</Dialog.Title><Dialog.Description
        >{api.details?.employee.employeeCode} · {api.details?.employee.department}</Dialog.Description
      ></Dialog.Header
    >
    <h3 class="font-semibold">{$t('employees.learning_report')}</h3>
    <Table.Root
      ><Table.Header
        ><Table.Row
          ><Table.Head>{$t('employees.course')}</Table.Head><Table.Head>{$t('employees.result')}</Table.Head><Table.Head
            >{$t('employees.score')}</Table.Head
          ><Table.Head>{$t('employees.due')}</Table.Head><Table.Head>{$t('employees.completed')}</Table.Head></Table.Row
        ></Table.Header
      ><Table.Body
        >{#each api.details?.learning ?? [] as course, index (`${course.courseId}-${index}`)}<Table.Row
            ><Table.Cell>{course.title}</Table.Cell><Table.Cell
              >{$t(`employees.progress.${course.status ?? 'assigned'}`)}</Table.Cell
            ><Table.Cell>{course.score ?? ''}</Table.Cell><Table.Cell
              >{course.dueDate ? new Date(course.dueDate).toLocaleDateString() : ''}</Table.Cell
            ><Table.Cell>{course.completedAt ? new Date(course.completedAt).toLocaleDateString() : ''}</Table.Cell
            ></Table.Row
          >{:else}<Table.Row><Table.Cell colspan={5}>{$t('employees.no_learning')}</Table.Cell></Table.Row
          >{/each}</Table.Body
      ></Table.Root
    >
    {#if canManage}<h3 class="font-semibold">{$t('employees.history')}</h3>
      <ul class="space-y-2 text-sm">
        {#each api.details?.audit ?? [] as event (event.id)}<li>
            <span class="ui:text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</span> · {$t(
              `employees.audit.${event.action}`
            )} · {event.actorName ?? ''}{#if event.reason}
              · {event.reason}{/if}
          </li>{/each}
      </ul>{/if}
    <Dialog.Footer
      ><Button
        size="sm"
        variant="outline"
        onclick={() => {
          api.detailOpen = false;
        }}>{$t('employees.close')}</Button
      ></Dialog.Footer
    >
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root
  open={!!api.statusTarget}
  onOpenChange={(open) => {
    if (!open) api.statusTarget = null;
  }}
>
  <Dialog.Content
    ><Dialog.Header
      ><Dialog.Title>{$t(`employees.status.${api.nextStatus}`)} · {api.statusTarget?.fullname}</Dialog.Title
      ><Dialog.Description>{$t('employees.status_hint')}</Dialog.Description></Dialog.Header
    >
    <Field.Field
      ><Field.Label for="employee-reason">{$t('employees.reason')}</Field.Label><Textarea
        id="employee-reason"
        bind:value={api.reason}
        maxlength={500}
        required
      /></Field.Field
    >
    {#if api.message}<p role="alert" class="ui:text-destructive text-sm">{$t(api.message)}</p>{/if}
    <Dialog.Footer
      ><Button
        size="sm"
        variant="outline"
        onclick={() => {
          api.statusTarget = null;
        }}>{$t('employees.cancel')}</Button
      ><Button
        size="sm"
        disabled={!api.reason.trim() || api.isLoading}
        loading={api.isLoading}
        onclick={() => api.changeStatus()}>{$t('employees.confirm')}</Button
      ></Dialog.Footer
    >
  </Dialog.Content>
</Dialog.Root>

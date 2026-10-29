<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import * as Dialog from '@cio/ui/base/dialog';
  import * as UnderlineTabs from '@cio/ui/custom/underline-tabs';
  import { Button } from '@cio/ui/base/button';
  import { CheckboxField } from '@cio/ui/custom/checkbox-field';
  import { InputField } from '@cio/ui/custom/input-field';
  import { TextareaField } from '@cio/ui/custom/textarea-field';
  import { MultiSelectList } from '@cio/ui/custom/multi-select-list';
  import { DebouncedSearch } from '$lib/utils/functions/debounced-search.svelte';
  import { currentOrg, currentOrgPath, isOrgAdmin } from '$lib/utils/store/org';
  import { courseApi } from '$features/course/api';
  import { PeopleApi } from '$features/course/api/people.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { ROLE } from '@cio/utils/constants';

  let { onMembersChanged }: { onMembersChanged?: () => void } = $props();
  const peopleApi = new PeopleApi();
  const selectedIds = new SvelteSet<string>();
  const search = new DebouncedSearch({
    onApply: (value) => {
      void peopleApi.listAvailableEmployees(courseId, value);
    }
  });
  const courseId = $derived(courseApi.course?.id ?? '');
  const isOpen = $derived(page.url.searchParams.get('add') === 'true');
  let activeTab = $state('students');
  let sendEmail = $state(true);
  let required = $state(true);
  let dueDate = $state('');
  let message = $state('');
  let loadedContext = '';
  const availableEmployees = $derived(peopleApi.availableEmployees);
  const items = $derived(
    (availableEmployees ?? [])
      .filter((employee) => activeTab === 'students' || ['ADMIN', 'TUTOR'].includes(employee.role))
      .flatMap((employee) =>
        employee.profileId
          ? [
              {
                id: employee.profileId,
                label: employee.name,
                description: `${employee.employeeCode} · ${employee.email}`
              }
            ]
          : []
      )
  );

  function closeModal() {
    search.reset();
    goto(resolve(page.url.pathname, {}));
  }

  function changeTab(value: string) {
    activeTab = value;
    selectedIds.clear();
    search.reset();
    void peopleApi.listAvailableEmployees(courseId);
  }

  function toggleEmployee(profileId: string) {
    if (selectedIds.has(profileId)) {
      selectedIds.delete(profileId);
      return;
    }

    selectedIds.add(profileId);
  }

  async function assignEmployees() {
    const roleId = activeTab === 'tutors' ? ROLE.TUTOR : ROLE.STUDENT;
    const members = [...selectedIds].map((profileId) => ({ profileId, roleId }));
    const deadline = dueDate ? new Date(dueDate).toISOString() : null;
    const payload = { profileIds: [...selectedIds], required, dueDate: deadline, message, sendEmail };
    const response =
      activeTab === 'students'
        ? await peopleApi.assignTraining(courseId, payload)
        : await peopleApi.add(courseId, members, sendEmail);
    if (!response) return;

    selectedIds.clear();
    onMembersChanged?.();
    closeModal();
  }

  $effect(() => {
    const context = isOpen && courseId && $currentOrg.id ? `${courseId}:${$currentOrg.id}` : '';
    if (context === loadedContext) return;

    loadedContext = context;
    if (!context) return;

    untrack(() => {
      activeTab = 'students';
      search.reset();
      sendEmail = true;
      peopleApi.errors = {};
      required = true;
      dueDate = '';
      message = '';
      selectedIds.clear();
      peopleApi.availableEmployees = null;
      void peopleApi.listAvailableEmployees(courseId);
    });
  });

  onDestroy(() => search.destroy());
</script>

<Dialog.Root
  open={isOpen}
  onOpenChange={(open) => {
    if (!open) closeModal();
  }}
>
  <Dialog.Content class="max-h-[80vh] w-[96vw] max-w-3xl! overflow-y-auto">
    <Dialog.Header>
      <Dialog.Title>{$t('training_assignment.title')}</Dialog.Title>
      <Dialog.Description>{$t('training_assignment.description')}</Dialog.Description>
    </Dialog.Header>
    <UnderlineTabs.Root value={activeTab} onValueChange={changeTab}>
      <UnderlineTabs.List>
        <UnderlineTabs.Trigger value="students">{$t('course.employee_enrollment.learners')}</UnderlineTabs.Trigger>
        {#if $isOrgAdmin}
          <UnderlineTabs.Trigger value="tutors">{$t('course.employee_enrollment.instructors')}</UnderlineTabs.Trigger>
        {/if}
      </UnderlineTabs.List>
    </UnderlineTabs.Root>
    <MultiSelectList
      {items}
      isLoading={!availableEmployees || peopleApi.isLoading}
      isSelected={(id) => selectedIds.has(id)}
      onToggle={toggleEmployee}
      bind:searchValue={search.draft}
      onSearchValueChange={(value) => search.input(value)}
      searchPlaceholder={$t('course.employee_enrollment.search')}
      emptyMessage={$t('course.employee_enrollment.empty')}
      namePrefix="course-employee"
      listClass="max-h-64"
    />
    <p class="ui:text-muted-foreground text-sm">
      {$t('course.employee_enrollment.manage_hint')}
      <a class="ui:text-primary underline" href={`${$currentOrgPath}/employees`}>{$t('employees.title')}</a>
    </p>
    {#if activeTab === 'students'}
      <CheckboxField
        name="training-required"
        label={$t('training_assignment.required')}
        bind:checked={required}
        disabled={courseApi.course?.type === 'COMPLIANCE'}
      />
      {#if courseApi.course?.type === 'COMPLIANCE'}
        <p class="ui:text-muted-foreground text-sm">{$t('training_assignment.compliance_controls')}</p>
      {:else}
        <InputField
          name="training-deadline"
          type="datetime-local"
          label={$t('training_assignment.deadline')}
          bind:value={dueDate}
          errorMessage={peopleApi.errors.dueDate}
          onInput={() => delete peopleApi.errors.dueDate}
        />
      {/if}
      <TextareaField
        name="training-message"
        label={$t('training_assignment.message')}
        aria-label={$t('training_assignment.message')}
        bind:value={message}
      />
      <p class="ui:text-muted-foreground text-sm">{$t('training_assignment.existing_hint')}</p>
    {/if}
    <CheckboxField
      name="notify-course-employees"
      label={$t('course.employee_enrollment.notify')}
      bind:checked={sendEmail}
    />
    <Dialog.Footer>
      <Button size="sm" variant="outline" onclick={closeModal}>{$t('common.cancel')}</Button>
      <Button
        testId="training-assignment-submit"
        size="sm"
        onclick={assignEmployees}
        loading={peopleApi.isLoading}
        disabled={!selectedIds.size || peopleApi.isLoading}
      >
        {$t(activeTab === 'students' ? 'training_assignment.title' : 'course.employee_enrollment.instructors')} ({selectedIds.size})
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

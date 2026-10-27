<script lang="ts">
  import { currentOrg } from '$lib/utils/store/org';
  import { t } from '$lib/utils/functions/translations';
  import * as Field from '@cio/ui/base/field';
  import { Switch } from '@cio/ui/base/switch';
  import LockIcon from '@lucide/svelte/icons/lock';
  import { orgApi } from '$features/org/api/org.svelte';

  interface Props {
    hasUnsavedChanges?: boolean;
  }

  let { hasUnsavedChanges = $bindable(false) }: Props = $props();
  let fields = $state({ disableEmailPassword: false, disableGoogleAuth: false });
  let savedSnapshot = $state('');
  let capturedOrganizationId = $state('');
  let isSaving = $state(false);

  $effect(() => {
    const organizationId = $currentOrg.id;
    if (!organizationId || organizationId === capturedOrganizationId) return;

    capturedOrganizationId = organizationId;
    fields.disableEmailPassword = $currentOrg.disableEmailPassword ?? false;
    fields.disableGoogleAuth = $currentOrg.disableGoogleAuth ?? false;
    savedSnapshot = JSON.stringify(fields);
  });

  $effect(() => {
    hasUnsavedChanges = !!savedSnapshot && JSON.stringify(fields) !== savedSnapshot;
  });

  export async function handleSave() {
    if (!$currentOrg.id) return;

    isSaving = true;
    try {
      await orgApi.update($currentOrg.id, fields);
      if (orgApi.success) savedSnapshot = JSON.stringify(fields);
    } finally {
      isSaving = false;
    }
  }

  export function handleDiscard() {
    if (!savedSnapshot) return;

    const saved = JSON.parse(savedSnapshot);
    fields.disableEmailPassword = saved.disableEmailPassword;
    fields.disableGoogleAuth = saved.disableGoogleAuth;
  }
</script>

<Field.Group class="w-full max-w-2xl! px-2">
  <Field.Set>
    <Field.Legend class="flex items-center gap-2">
      <LockIcon class="size-5" />
      {$t('settings.auth.general.heading')}
    </Field.Legend>
    <Field.Description>{$t('mp_learning.settings.access_policy')}</Field.Description>
    <Field.Group>
      <Field.Field orientation="horizontal">
        <Switch bind:checked={fields.disableEmailPassword} disabled={isSaving} />
        <div class="space-y-0.5">
          <Field.Label>{$t('settings.auth.general.disable_email_password.label')}</Field.Label>
          <Field.Description>{$t('settings.auth.general.disable_email_password.description')}</Field.Description>
        </div>
      </Field.Field>
      <Field.Field orientation="horizontal">
        <Switch bind:checked={fields.disableGoogleAuth} disabled={isSaving} />
        <div class="space-y-0.5">
          <Field.Label>{$t('settings.auth.general.disable_google_auth.label')}</Field.Label>
          <Field.Description>{$t('settings.auth.general.disable_google_auth.description')}</Field.Description>
        </div>
      </Field.Field>
    </Field.Group>
  </Field.Set>
</Field.Group>

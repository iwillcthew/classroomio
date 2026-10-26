<script lang="ts">
  import { page } from '$app/state';
  import { AuthUI } from '$features/ui';
  import { ActivationApi } from '$features/workforce/api/activation.svelte';
  import { t } from '$lib/utils/functions/translations';
  import { Password } from '@cio/ui/custom/password';
  import { Button } from '@cio/ui/base/button';
  import * as Field from '@cio/ui/base/field';
  import { onMount } from 'svelte';

  const api = new ActivationApi();
  const token = $derived(page.url.searchParams.get('token') ?? '');
  onMount(() => {
    void api.load(token);
  });
</script>

<svelte:head>
  <title>{$t('workforce.activate')} · MP Learning</title>
  <meta name="referrer" content="no-referrer" />
</svelte:head>

<AuthUI showOnlyContent hideGoogleAuth isLoading={api.isLoading} handleSubmit={() => api.activate(token)}>
  <div class="space-y-5">
    <h1 class="text-xl font-semibold">{$t('workforce.activate')}</h1>
    {#if api.completed}
      <p data-testid="employee-activation-success">{$t('workforce.activation_success')}</p>
      <a class="ui:text-primary underline" href="/login">{$t('login.login')}</a>
    {:else if api.preview}
      <p>{api.preview.fullname} · <strong>{api.preview.employeeCode}</strong></p>
      <Field.Group>
        <Field.Field>
          <Field.Label for="activation-password">{$t('login.password')}</Field.Label>
          <Password
            id="activation-password"
            bind:value={api.password}
            autocomplete="new-password"
            showPasswordTooltip={$t('auth.password.show')}
            hidePasswordTooltip={$t('auth.password.hide')}
            showPasswordAriaLabel={$t('auth.password.show')}
            hidePasswordAriaLabel={$t('auth.password.hide')}
          />
          <Field.Description>{$t('workforce.password_hint')}</Field.Description>
        </Field.Field>
        <Field.Field>
          <Field.Label for="activation-confirm">{$t('workforce.confirm_password')}</Field.Label>
          <Password
            id="activation-confirm"
            bind:value={api.confirmPassword}
            autocomplete="new-password"
            showPasswordTooltip={$t('auth.password.show')}
            hidePasswordTooltip={$t('auth.password.hide')}
            showPasswordAriaLabel={$t('auth.password.show')}
            hidePasswordAriaLabel={$t('auth.password.hide')}
          />
        </Field.Field>
      </Field.Group>
      <Button
        type="button"
        loading={api.isLoading}
        disabled={api.isLoading}
        onclick={() => api.activate(token)}
        testId="employee-activate-submit">{$t('workforce.activate')}</Button
      >
    {:else if api.isLoading}
      <p>{$t('common.loading')}</p>
    {/if}
    {#if api.error}<p role="alert" class="ui:text-destructive">{$t(api.errorKey)}</p>{/if}
  </div>
</AuthUI>

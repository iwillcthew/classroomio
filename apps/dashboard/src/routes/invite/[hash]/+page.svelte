<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { Button } from '@cio/ui/base/button';
  import { AuthUI } from '$features/ui';
  import { currentOrg, mergeAccountOrgFromServer } from '$lib/utils/store/org';
  import { setTheme } from '$lib/utils/functions/theme';
  import { authClient } from '$lib/utils/services/auth/client';
  import { OrganizationInviteApi } from '$features/invite/api/organization-invite.svelte';
  import { buildInviteAuthParams, getInviteAuthState } from '$features/invite/utils/invite-auth-utils';
  import { snackbar } from '$features/ui/snackbar/store';
  import { page } from '$app/state';
  import { t } from '$lib/utils/functions/translations';
  import { ROLE } from '@cio/utils/constants';

  let { data } = $props();

  const inviteApi = new OrganizationInviteApi();
  const session = authClient.useSession();
  const sessionUser = $derived($session.isPending ? data.locals?.user : $session.data?.user);
  const inviteAuth = $derived(getInviteAuthState(sessionUser, data.invite?.invite?.email));
  const loading = $derived(inviteApi.isLoading);

  const inviteStatus = $derived(data.invite?.invite?.status ?? 'INVALID');
  const isInviteEmailMismatch = $derived(inviteAuth.isEmailMismatch);
  const canJoinOrganization = $derived(inviteStatus === 'ACTIVE' && !isInviteEmailMismatch);
  const isAlreadyJoined = $derived(inviteStatus === 'ACCEPTED' && !isInviteEmailMismatch);

  const orgSlug = $derived(data.currentOrg?.siteName ?? data.invite.organization.siteName ?? '');

  const loginParams = $derived(
    buildInviteAuthParams(page.url.pathname + page.url.search, data.invite?.invite?.email || '')
  );
  const loginUrl = $derived(resolve(`/login?${loginParams}`, {}));

  const orgName = $derived(data.invite?.organization?.name ?? '');
  const inviteRoleId = $derived(data.invite?.invite?.roleId ?? 0);

  function getBlockedInviteMessage(): string {
    if (isInviteEmailMismatch) {
      return t.get('invite.organization.messages.email_mismatch');
    }

    if (inviteStatus === 'EXPIRED') {
      return t.get('invite.organization.messages.expired');
    }

    if (inviteStatus === 'REVOKED') {
      return t.get('invite.organization.messages.revoked');
    }

    if (inviteStatus === 'ACCEPTED') {
      return t.get('invite.organization.messages.accepted');
    }

    return t.get('invite.organization.messages.invalid');
  }

  async function handleSubmit() {
    if (inviteStatus !== 'ACTIVE') {
      snackbar.error(getBlockedInviteMessage());
      return;
    }

    if (!inviteAuth.isAuthenticated) {
      return goto(resolve(`/signup?${loginParams}`, {}));
    }

    if (isInviteEmailMismatch) {
      snackbar.error(getBlockedInviteMessage());
      return;
    }

    await inviteApi.accept(data.token);
  }

  function handleNavigateAfterJoined() {
    if (inviteRoleId === ROLE.STUDENT) {
      return goto(resolve('/lms', {}));
    }
    return goto(resolve(orgSlug ? `/org/${orgSlug}` : '/org', {}));
  }

  onMount(async () => {
    if (!data.currentOrg) return;

    setTheme(data.currentOrg?.theme || '');
    currentOrg.set(mergeAccountOrgFromServer(data.currentOrg));
  });
</script>

<svelte:head>
  <title>{$t('invite.organization.page_title', { orgName: data.invite.organization.name })}</title>
</svelte:head>

<AuthUI isLogin={false} {handleSubmit} isLoading={loading} showOnlyContent={true} showLogo={true}>
  <div class="mt-0 w-full">
    <p class="text-center text-sm font-light dark:text-white">
      {#if inviteRoleId === ROLE.STUDENT}
        {$t('invite.organization.invitation_student', { orgName })}
      {:else if inviteRoleId === ROLE.TUTOR}
        {$t('invite.organization.invitation_teacher', { orgName })}
      {:else if inviteRoleId === ROLE.ADMIN}
        {$t('invite.organization.invitation_admin', { orgName })}
      {:else}
        {$t('invite.organization.invitation_fallback', {
          orgName,
          role: data.invite.invite.roleLabel
        })}
      {/if}
    </p>
    <p class="mt-3 text-center text-sm font-light dark:text-white">
      {$t('invite.organization.email_line', { email: data.invite.invite.email })}
    </p>

    {#if !canJoinOrganization && !isAlreadyJoined}
      <p class="mt-3 text-center text-sm text-red-500">{getBlockedInviteMessage()}</p>
    {/if}
  </div>

  <div class="my-4 flex w-full flex-col items-center justify-center gap-3">
    {#if isAlreadyJoined}
      <Button type="button" onclick={handleNavigateAfterJoined}>
        {#if inviteRoleId === ROLE.STUDENT}
          {$t('navigation.goto_lms')}
        {:else}
          {$t('invite.organization.go_to_dashboard')}
        {/if}
      </Button>
    {:else}
      <Button type="submit" disabled={!canJoinOrganization || loading} {loading}>
        {$t('invite.organization.accept_button')}
      </Button>
    {/if}
    {#if isInviteEmailMismatch}
      <Button type="button" variant="secondary" disabled={loading} onclick={() => inviteApi.switchAccount(loginUrl)}>
        {$t('verify_email_modal.switch_account')}
      </Button>
    {:else if !inviteAuth.isAuthenticated}
      <p class="ui:text-muted-foreground text-center text-sm">
        {$t('login.already_have_account')}
        <a class="ui:text-primary hover:underline" href={resolve(`/login?${loginParams}`, {})}> {$t('login.login')}</a>
      </p>
    {/if}
  </div>
</AuthUI>

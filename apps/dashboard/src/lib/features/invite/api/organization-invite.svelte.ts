import { BaseApiWithErrors, classroomio } from '$lib/utils/services/api';
import { authClient } from '$lib/utils/services/auth/client';
import { snackbar } from '$features/ui/snackbar/store';
import { t } from '$lib/utils/functions/translations';
import type { AcceptOrgInviteByTokenRequest } from '../utils/types';

export class OrganizationInviteApi extends BaseApiWithErrors {
  async accept(token: string) {
    if (this.isLoading) return;

    await this.execute<AcceptOrgInviteByTokenRequest>({
      requestFn: () => classroomio.invite.organization[':token'].accept.$post({ param: { token } }),
      logContext: 'accepting organization invite',
      onSuccess: (response) => {
        snackbar.success('invite.organization.messages.joined');
        window.location.href = response.data.redirectTo || '/org';
      },
      onError: (result) => {
        const message = typeof result === 'object' ? result.error : null;
        snackbar.error(message || t.get('invite.organization.messages.join_failed'));
      }
    });
  }

  async switchAccount(loginUrl: string) {
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      const { error } = await authClient.signOut();
      if (error) throw error;

      window.location.href = loginUrl;
    } catch (error) {
      console.error('Failed to switch invite account', error);
      snackbar.error('snackbar.something');
    } finally {
      this.isLoading = false;
    }
  }
}

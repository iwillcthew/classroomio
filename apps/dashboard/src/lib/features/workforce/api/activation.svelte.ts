import { BaseApi, classroomio } from '$lib/utils/services/api';
import { ZEmployeeActivation } from '@cio/utils/validation/organization';
import { workforceErrorKey } from '../utils/workforce-utils';
import type { ActivationPreview, ActivationPreviewRequest } from '../utils/types';

export class ActivationApi extends BaseApi {
  preview = $state<ActivationPreview | null>(null);
  password = $state('');
  confirmPassword = $state('');
  completed = $state(false);

  get errorKey() {
    return workforceErrorKey(this.error);
  }

  async load(token: string) {
    await this.execute<ActivationPreviewRequest>({
      requestFn: () => classroomio.workforce.activation.$get({ query: { token } }),
      onSuccess: (result) => {
        this.preview = result.data;
      }
    });
  }

  async activate(token: string) {
    const parsed = ZEmployeeActivation.safeParse({ token, password: this.password });
    if (!parsed.success || this.password !== this.confirmPassword) {
      this.error = 'workforce.errors.password';
      return;
    }

    await this.execute<typeof classroomio.workforce.activation.$post>({
      requestFn: () => classroomio.workforce.activation.$post({ json: parsed.data }),
      onSuccess: () => {
        this.completed = true;
        this.password = '';
        this.confirmPassword = '';
      }
    });
  }
}

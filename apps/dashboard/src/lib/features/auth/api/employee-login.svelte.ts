import { authClient } from '$lib/utils/services/auth/client';
import { ZEmployeeCode } from '@cio/utils/validation/organization';
import { t } from '$lib/utils/functions/translations';

class EmployeeLoginApi {
  loading = $state(false);
  error = $state('');

  async login(employeeCode: string, password: string, redirectPath: string) {
    this.error = '';
    const parsed = ZEmployeeCode.safeParse(employeeCode);
    if (!parsed.success || !password) {
      this.error = t.get('workforce.errors.login');
      return;
    }

    this.loading = true;
    try {
      const result = await authClient.$fetch('/sign-in/employee', {
        method: 'POST',
        body: { employeeCode: parsed.data, password }
      });
      if (result.error) throw new Error('workforce.errors.login');

      const safeRedirect =
        redirectPath.startsWith('/') && !redirectPath.startsWith('//') && !redirectPath.includes('\\')
          ? redirectPath
          : '/lms';
      window.location.href = safeRedirect;
    } catch {
      this.error = t.get('workforce.errors.login');
    } finally {
      this.loading = false;
    }
  }
}

export const employeeLoginApi = new EmployeeLoginApi();

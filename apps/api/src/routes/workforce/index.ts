import { Hono } from '@api/utils/hono';
import { authMiddleware } from '@api/middlewares/auth';
import { handleError } from '@api/utils/errors';
import { zValidator } from '@hono/zod-validator';
import {
  ZCreateEmployee,
  ZEmployeeActivation,
  ZEmployeeActivationToken,
  ZEmployeeId,
  ZEmployeeImport,
  ZJobTitle,
  ZLearningPath,
  ZTrainingRule,
  ZUpdateEmployee,
  ZWorkforceFilters,
  ZWorkforceProfileQuery,
  ZWorkforceResourceId,
  ZWorkforceUnit
} from '@cio/utils/validation/organization';
import {
  activateEmployee,
  createEmployee,
  getEmployeeAssignments,
  getEmployeeHistory,
  getWorkforceOverview,
  getWorkforceReport,
  previewEmployeeActivation,
  saveJobTitle,
  saveTrainingConfiguration,
  saveUnit,
  sendEmployeeActivation,
  updateEmployee,
  getWorkforceFilterOptions,
  importEmployees,
  getWorkforceScopedProfiles
} from '@api/services/workforce/workforce';

export const workforceRouter = new Hono()
  .get('/activation', zValidator('query', ZEmployeeActivationToken), async (context) => {
    try {
      const { token } = context.req.valid('query');
      const data = await previewEmployeeActivation(token);
      context.header('Cache-Control', 'no-store');
      context.header('Referrer-Policy', 'no-referrer');
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.activation_invalid');
    }
  })
  .post('/activation', zValidator('json', ZEmployeeActivation), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await activateEmployee(fields.token, fields.password);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.activation_invalid');
    }
  })
  .use('*', authMiddleware)
  .use('*', async (context, next) => {
    const organizationId = context.req.header('cio-org-id');
    const validation = ZWorkforceResourceId.safeParse({ resourceId: organizationId });
    if (!validation.success) return context.json({ success: false as const, error: 'workforce.errors.forbidden' }, 403);

    await next();
  })
  .get('/filter-options', async (context) => {
    try {
      const data = await getWorkforceFilterOptions(context.req.header('cio-org-id') ?? '', context.get('user')!.id);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .get('/profiles', zValidator('query', ZWorkforceProfileQuery), async (context) => {
    try {
      const filters = context.req.valid('query');
      const data = await getWorkforceScopedProfiles(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        filters
      );
      context.header('Cache-Control', 'private, no-store');
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .get('/', zValidator('query', ZWorkforceFilters), async (context) => {
    try {
      const organizationId = context.req.header('cio-org-id') ?? '';
      const filters = context.req.valid('query');
      const data = await getWorkforceOverview(organizationId, context.get('user')!.id, filters);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .post('/employees', zValidator('json', ZCreateEmployee), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await createEmployee(context.req.header('cio-org-id') ?? '', context.get('user')!.id, fields);
      return context.json({ success: true as const, data }, 201);
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .post('/import', zValidator('json', ZEmployeeImport), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await importEmployees(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        fields.employees
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .patch(
    '/employees/:employeeId',
    zValidator('param', ZEmployeeId),
    zValidator('json', ZUpdateEmployee),
    async (context) => {
      try {
        const { employeeId } = context.req.valid('param');
        const fields = context.req.valid('json');
        const data = await updateEmployee(
          context.req.header('cio-org-id') ?? '',
          context.get('user')!.id,
          employeeId,
          fields
        );
        return context.json({ success: true as const, data });
      } catch (error) {
        return handleError(context, error, 'workforce.errors.request_failed');
      }
    }
  )
  .post('/employees/:employeeId/activation', zValidator('param', ZEmployeeId), async (context) => {
    try {
      const { employeeId } = context.req.valid('param');
      const data = await sendEmployeeActivation(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        employeeId
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .get('/employees/:employeeId/history', zValidator('param', ZEmployeeId), async (context) => {
    try {
      const { employeeId } = context.req.valid('param');
      const data = await getEmployeeHistory(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        employeeId
      );
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .post('/units', zValidator('json', ZWorkforceUnit), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await saveUnit(context.req.header('cio-org-id') ?? '', context.get('user')!.id, fields);
      return context.json({ success: true as const, data }, 201);
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .put(
    '/units/:resourceId',
    zValidator('param', ZWorkforceResourceId),
    zValidator('json', ZWorkforceUnit),
    async (context) => {
      try {
        const { resourceId } = context.req.valid('param');
        const fields = context.req.valid('json');
        const data = await saveUnit(
          context.req.header('cio-org-id') ?? '',
          context.get('user')!.id,
          fields,
          resourceId
        );
        return context.json({ success: true as const, data });
      } catch (error) {
        return handleError(context, error, 'workforce.errors.request_failed');
      }
    }
  )
  .post('/job-titles', zValidator('json', ZJobTitle), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await saveJobTitle(context.req.header('cio-org-id') ?? '', context.get('user')!.id, fields);
      return context.json({ success: true as const, data }, 201);
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .put(
    '/job-titles/:resourceId',
    zValidator('param', ZWorkforceResourceId),
    zValidator('json', ZJobTitle),
    async (context) => {
      try {
        const { resourceId } = context.req.valid('param');
        const fields = context.req.valid('json');
        const data = await saveJobTitle(
          context.req.header('cio-org-id') ?? '',
          context.get('user')!.id,
          fields,
          resourceId
        );
        return context.json({ success: true as const, data });
      } catch (error) {
        return handleError(context, error, 'workforce.errors.request_failed');
      }
    }
  )
  .post('/rules', zValidator('json', ZTrainingRule), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await saveTrainingConfiguration(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        'rule',
        fields
      );
      return context.json({ success: true as const, data }, 201);
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .put(
    '/rules/:resourceId',
    zValidator('param', ZWorkforceResourceId),
    zValidator('json', ZTrainingRule),
    async (context) => {
      try {
        const { resourceId } = context.req.valid('param');
        const fields = context.req.valid('json');
        const data = await saveTrainingConfiguration(
          context.req.header('cio-org-id') ?? '',
          context.get('user')!.id,
          'rule',
          fields,
          resourceId
        );
        return context.json({ success: true as const, data });
      } catch (error) {
        return handleError(context, error, 'workforce.errors.request_failed');
      }
    }
  )
  .post('/paths', zValidator('json', ZLearningPath), async (context) => {
    try {
      const fields = context.req.valid('json');
      const data = await saveTrainingConfiguration(
        context.req.header('cio-org-id') ?? '',
        context.get('user')!.id,
        'path',
        fields
      );
      return context.json({ success: true as const, data }, 201);
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .put(
    '/paths/:resourceId',
    zValidator('param', ZWorkforceResourceId),
    zValidator('json', ZLearningPath),
    async (context) => {
      try {
        const { resourceId } = context.req.valid('param');
        const fields = context.req.valid('json');
        const data = await saveTrainingConfiguration(
          context.req.header('cio-org-id') ?? '',
          context.get('user')!.id,
          'path',
          fields,
          resourceId
        );
        return context.json({ success: true as const, data });
      } catch (error) {
        return handleError(context, error, 'workforce.errors.request_failed');
      }
    }
  )
  .get('/assignments', async (context) => {
    try {
      const data = await getEmployeeAssignments(context.req.header('cio-org-id') ?? '', context.get('user')!.id);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  })
  .get('/reports', zValidator('query', ZWorkforceFilters), async (context) => {
    try {
      const filters = context.req.valid('query');
      const data = await getWorkforceReport(context.req.header('cio-org-id') ?? '', context.get('user')!.id, filters);
      return context.json({ success: true as const, data });
    } catch (error) {
      return handleError(context, error, 'workforce.errors.request_failed');
    }
  });

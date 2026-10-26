import { Hono } from '@api/utils/hono';
import { v1Router } from '@api/routes/v1';

export const publicApiRouter = new Hono().route('/v1', v1Router);

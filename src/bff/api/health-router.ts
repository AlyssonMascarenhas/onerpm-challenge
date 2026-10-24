import { Router } from 'express';
import { CACHE_CONTROL_NO_STORE } from './api.constants';

/**
 * `GET /api/health`: "the server is up", for the container health check and the hosting platform. It does not
 * call Spotify, so a Spotify outage never makes the platform restart a server that is working.
 */
export function createHealthRouter(): Router {
  const router = Router();
  router.get('/health', (_request, response) => {
    response.set('Cache-Control', CACHE_CONTROL_NO_STORE).json({ status: 'ok' });
  });
  return router;
}

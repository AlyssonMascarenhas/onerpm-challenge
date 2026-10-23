import { ErrorRequestHandler, RequestHandler, Router } from 'express';
import { ApiError, TracksResponse } from '../../contract/tracks';
import { Logger, TracksService } from '../tracks/tracks-service';
import { MAX_ISRCS_PER_REQUEST, parseIsrcQuery } from './parse-isrc-query';

/** Browsers may reuse a response briefly; the server-side cache is the one that matters. */
const CACHE_CONTROL = 'public, max-age=60';

export function createTracksRouter(service: TracksService): Router {
  const router = Router();

  router.get('/tracks', async (req, res) => {
    const query = parseIsrcQuery(req.query['isrc']);

    if (query.kind === 'invalid') {
      return sendError(res, 400, {
        code: 'invalid_isrc',
        message: 'Provide one or more valid ISRCs in the "isrc" query parameter.',
        invalid: query.invalid,
      });
    }
    if (query.kind === 'too_many') {
      return sendError(res, 400, {
        code: 'too_many_isrcs',
        message: `At most ${MAX_ISRCS_PER_REQUEST} ISRCs per request.`,
      });
    }

    const results = await service.lookup(query.isrcs);

    // Every lookup failed: the integration itself is down, so say so instead of "200 with nothing".
    if (results.every((result) => result.status === 'error')) {
      return sendError(res, 503, {
        code: 'integration_unavailable',
        message: 'The music data provider is currently unavailable.',
      });
    }

    const body: TracksResponse = { results };
    res.set('Cache-Control', CACHE_CONTROL).json(body);
  });

  return router;
}

/** Unknown `/api/*` paths must answer JSON, not fall through to the SSR HTML renderer. */
export const apiNotFound: RequestHandler = (_req, res) => {
  sendError(res, 404, { code: 'not_found', message: 'Unknown API route.' });
};

export function createApiErrorHandler(logger: Logger): ErrorRequestHandler {
  // Express recognizes error handlers by their 4-argument signature, so `_next` must stay.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return (error, _req, res, _next) => {
    logger.error('Unhandled API error', error);
    sendError(res, 500, { code: 'internal_error', message: 'Unexpected error.' });
  };
}

function sendError(res: Parameters<RequestHandler>[1], status: number, body: ApiError): void {
  res.status(status).set('Cache-Control', 'no-store').json(body);
}

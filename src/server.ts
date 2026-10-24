import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import compression from 'compression';
import express from 'express';
import { join } from 'node:path';
import { createApiRouter } from './bff/api/create-api-router';
import { loadLocalEnvFile } from './bff/config';
import { securityHeaders } from './bff/http/security-headers';

loadLocalEnvFile();

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/** Do not tell the world which framework answers. */
app.disable('x-powered-by');

/** Everything below is sent compressed (gzip or Brotli) when the browser accepts it: pages, scripts, styles, JSON. */
app.use(compression());

/** Headers that tell the browser how to treat the page (framing, sniffing, referrer, features, HSTS on HTTPS). */
app.use(securityHeaders());

/** BFF: keeps the Spotify credentials on the server. Must come before the SSR catch-all. */
app.use('/api', createApiRouter({ env: process.env }));

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 * The rendered language follows `Accept-Language`, so caches must not share pages across languages.
 */
app.use((req, res, next) => {
  res.vary('Accept-Language');
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

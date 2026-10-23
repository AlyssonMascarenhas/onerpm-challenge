import { Router } from 'express';
import { readSpotifyCredentials } from '../config';
import { Clock, FetchFn, Sleep } from '../spotify/http';
import { SpotifyClient } from '../spotify/spotify-client';
import { SpotifyUnavailableError } from '../spotify/spotify-errors';
import { SpotifyTokenProvider } from '../spotify/token-provider';
import { CachingTrackFinder } from '../tracks/caching-track-finder';
import { SpotifyTrackFinder, TrackFinder } from '../tracks/track-finder';
import { Logger, TracksService } from '../tracks/tracks-service';
import { apiNotFound, createApiErrorHandler, createTracksRouter } from './tracks-router';

export interface ApiRouterOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly logger?: Logger;
  /** Test seams: replace the network, the clock and the sleeping. */
  readonly fetchFn?: FetchFn;
  readonly now?: Clock;
  readonly sleep?: Sleep;
}

const CACHE_TTL_MS = 5 * 60_000;
const CACHE_MAX_ENTRIES = 500;

/** Composition root of the BFF: wires config → Spotify adapters → finder → service → HTTP routes. */
export function createApiRouter(options: ApiRouterOptions): Router {
  const logger = options.logger ?? console;
  const service = new TracksService(createTrackFinder(options, logger), logger);

  const router = Router();
  router.use(createTracksRouter(service));
  router.use(apiNotFound);
  router.use(createApiErrorHandler(logger));
  return router;
}

function createTrackFinder(options: ApiRouterOptions, logger: Logger): TrackFinder {
  const credentials = readSpotifyCredentials(options.env);
  if (!credentials) {
    logger.warn(
      'SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are not set; /api/tracks will answer 503.',
    );
    return {
      findByIsrc: () => Promise.reject(new SpotifyUnavailableError('missing_credentials')),
    };
  }

  const tokens = new SpotifyTokenProvider(credentials, {
    fetchFn: options.fetchFn,
    now: options.now,
  });
  const client = new SpotifyClient(tokens, { fetchFn: options.fetchFn, sleep: options.sleep });
  return new CachingTrackFinder(new SpotifyTrackFinder(client), {
    ttlMs: CACHE_TTL_MS,
    maxEntries: CACHE_MAX_ENTRIES,
    now: options.now,
  });
}

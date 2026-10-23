import { FetchFn, Sleep, systemSleep } from './http';
import { SpotifyUnavailableError } from './spotify-errors';
import { SpotifySearchResponse, SpotifyTrack } from './spotify.types';
import { AccessTokenProvider } from './token-provider';

/** Port the track finder depends on; the HTTP client below is one adapter for it. */
export interface TrackSearch {
  searchByIsrc(isrc: string, options?: { market?: string }): Promise<readonly SpotifyTrack[]>;
}

export interface SpotifyClientOptions {
  readonly fetchFn?: FetchFn;
  readonly sleep?: Sleep;
}

const SEARCH_URL = 'https://api.spotify.com/v1/search';
/** Search `limit` is capped at 10 since the February 2026 API changes. */
const SEARCH_LIMIT = 10;
const REQUEST_TIMEOUT_MS = 8_000;
/** Longer waits are not worth holding a user request open for: fail fast instead. */
const MAX_RATE_LIMIT_WAIT_MS = 5_000;
const MAX_RATE_LIMIT_RETRIES = 1;

export class SpotifyClient implements TrackSearch {
  private readonly fetchFn: FetchFn;
  private readonly sleep: Sleep;

  constructor(
    private readonly tokens: AccessTokenProvider,
    options: SpotifyClientOptions = {},
  ) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.sleep = options.sleep ?? systemSleep;
  }

  async searchByIsrc(
    isrc: string,
    options: { market?: string } = {},
  ): Promise<readonly SpotifyTrack[]> {
    const url = this.buildSearchUrl(isrc, options.market);
    let tokenRefreshed = false;
    let rateLimitRetries = 0;

    for (;;) {
      const response = await this.get(url);
      if (response.ok) {
        return this.parseTracks(response);
      }
      if (response.status === 401 && !tokenRefreshed) {
        tokenRefreshed = true;
        this.tokens.invalidate();
        continue;
      }
      if (response.status === 429 && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        const waitMs = retryAfterMs(response);
        if (waitMs !== null && waitMs <= MAX_RATE_LIMIT_WAIT_MS) {
          rateLimitRetries++;
          await this.sleep(waitMs);
          continue;
        }
      }
      throw new SpotifyUnavailableError(`search_failed_${response.status}`);
    }
  }

  private buildSearchUrl(isrc: string, market?: string): string {
    const params = new URLSearchParams({
      q: `isrc:${isrc}`,
      type: 'track',
      limit: String(SEARCH_LIMIT),
    });
    if (market) {
      params.set('market', market);
    }
    return `${SEARCH_URL}?${params}`;
  }

  private async get(url: string): Promise<Response> {
    const token = await this.tokens.getToken();
    try {
      return await this.fetchFn(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new SpotifyUnavailableError('search_network_error', { cause });
    }
  }

  private async parseTracks(response: Response): Promise<readonly SpotifyTrack[]> {
    const body = (await response.json().catch(() => null)) as Partial<SpotifySearchResponse> | null;
    const items = body?.tracks?.items;
    if (!Array.isArray(items)) {
      throw new SpotifyUnavailableError('search_response_malformed');
    }
    return items;
  }
}

/** `Retry-After` in seconds → milliseconds, or `null` when absent/unparseable. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (header === null) {
    return null;
  }
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null;
}

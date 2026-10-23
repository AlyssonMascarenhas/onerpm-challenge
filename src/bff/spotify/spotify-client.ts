import { systemSleep } from './http';
import { isSpotifyTrack } from './is-spotify-track';
import { FetchFn, Sleep } from './http.types';
import { SpotifyUnavailableError } from './spotify-errors';
import {
  MAX_RATE_LIMIT_RETRIES,
  MAX_RATE_LIMIT_WAIT_MS,
  REQUEST_TIMEOUT_MS,
  SEARCH_LIMIT,
  SEARCH_URL,
} from './spotify.constants';
import { SpotifyFailureReason } from './spotify.enums';
import {
  AccessTokenProvider,
  SearchOptions,
  SpotifyClientOptions,
  SpotifySearchResponse,
  SpotifyTrack,
  TrackSearch,
} from './spotify.interfaces';

export class SpotifyClient implements TrackSearch {
  private readonly _fetchFn: FetchFn;
  private readonly _sleep: Sleep;

  constructor(
    private readonly _tokens: AccessTokenProvider,
    options: SpotifyClientOptions = {},
  ) {
    this._fetchFn = options.fetchFn ?? fetch;
    this._sleep = options.sleep ?? systemSleep;
  }

  public async searchByIsrc(
    isrc: string,
    options: SearchOptions = {},
  ): Promise<readonly SpotifyTrack[]> {
    const url = this._buildSearchUrl(isrc, options.market);
    let tokenRefreshed = false;
    let rateLimitRetries = 0;

    while (true) {
      const response = await this._get(url);
      if (response.ok) {
        return this._parseTracks(response);
      }
      if (response.status === 401 && !tokenRefreshed) {
        tokenRefreshed = true;
        this._tokens.invalidate();
        continue;
      }
      if (response.status === 429 && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        const waitMs = retryAfterMs(response);
        if (waitMs !== null && waitMs <= MAX_RATE_LIMIT_WAIT_MS) {
          rateLimitRetries++;
          await this._sleep(waitMs);
          continue;
        }
      }
      throw new SpotifyUnavailableError(SpotifyFailureReason.SEARCH_FAILED, {
        status: response.status,
      });
    }
  }

  private _buildSearchUrl(isrc: string, market?: string): string {
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

  private async _get(url: string): Promise<Response> {
    const token = await this._tokens.getToken();
    try {
      return await this._fetchFn(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new SpotifyUnavailableError(SpotifyFailureReason.SEARCH_NETWORK_ERROR, { cause });
    }
  }

  private async _parseTracks(response: Response): Promise<readonly SpotifyTrack[]> {
    const body = (await response.json().catch(() => null)) as Partial<SpotifySearchResponse> | null;
    const items = body?.tracks?.items;
    if (!Array.isArray(items) || !items.every(isSpotifyTrack)) {
      throw new SpotifyUnavailableError(SpotifyFailureReason.SEARCH_RESPONSE_MALFORMED);
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

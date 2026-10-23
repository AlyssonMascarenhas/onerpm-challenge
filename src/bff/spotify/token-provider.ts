import { Clock, FetchFn, systemClock } from './http';
import { SpotifyUnavailableError } from './spotify-errors';
import { SpotifyTokenResponse } from './spotify.types';

export interface AccessTokenProvider {
  getToken(): Promise<string>;
  /** Drops the cached token (e.g. after a 401) so the next call fetches a new one. */
  invalidate(): void;
}

export interface SpotifyCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface TokenProviderOptions {
  readonly fetchFn?: FetchFn;
  readonly now?: Clock;
}

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
/** Renew a bit early so a token never expires mid-request. */
const EXPIRY_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;

interface CachedToken {
  readonly value: string;
  readonly expiresAt: number;
}

/**
 * Client Credentials token source. Caches the token until shortly before it expires and
 * collapses concurrent refreshes into a single request (single-flight).
 */
export class SpotifyTokenProvider implements AccessTokenProvider {
  private readonly fetchFn: FetchFn;
  private readonly now: Clock;
  private cached: CachedToken | null = null;
  private inflight: Promise<string> | null = null;

  constructor(
    private readonly credentials: SpotifyCredentials,
    options: TokenProviderOptions = {},
  ) {
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? systemClock;
  }

  getToken(): Promise<string> {
    if (this.cached && this.now() < this.cached.expiresAt) {
      return Promise.resolve(this.cached.value);
    }
    this.inflight ??= this.requestToken().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  invalidate(): void {
    this.cached = null;
  }

  private async requestToken(): Promise<string> {
    const response = await this.post();
    if (!response.ok) {
      throw new SpotifyUnavailableError(`token_request_failed_${response.status}`);
    }

    const body = (await response.json().catch(() => null)) as Partial<SpotifyTokenResponse> | null;
    if (typeof body?.access_token !== 'string' || typeof body.expires_in !== 'number') {
      throw new SpotifyUnavailableError('token_response_malformed');
    }

    const lifetimeMs = Math.max(body.expires_in * 1000 - EXPIRY_MARGIN_MS, 0);
    this.cached = { value: body.access_token, expiresAt: this.now() + lifetimeMs };
    return body.access_token;
  }

  private async post(): Promise<Response> {
    const { clientId, clientSecret } = this.credentials;
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    try {
      return await this.fetchFn(TOKEN_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new SpotifyUnavailableError('token_request_network_error', { cause });
    }
  }
}

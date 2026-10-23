import { FetchFn } from '../spotify/http.types';
import { SpotifyTrack } from '../spotify/spotify.interfaces';

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

export interface SearchQuery {
  readonly isrc: string;
  readonly market: string | null;
}

export interface FakeSpotifyOptions {
  /** Answer for each search: tracks (200) or a ready-made `Response` to simulate failures. */
  readonly search: (query: SearchQuery) => readonly SpotifyTrack[] | Response;
  /** Status of the token endpoint; anything but 200 simulates the auth service failing. */
  readonly tokenStatus?: number;
}

export interface FakeSpotify {
  readonly fetchFn: FetchFn;
  readonly tokenRequests: () => number;
  readonly searches: SearchQuery[];
}

/** In-memory stand-in for accounts.spotify.com and api.spotify.com, routed by URL. */
export function createFakeSpotify(options: FakeSpotifyOptions): FakeSpotify {
  let tokenRequests = 0;
  const searches: SearchQuery[] = [];

  const fetchFn: FetchFn = (input) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
    );

    if (url.hostname === 'accounts.spotify.com') {
      tokenRequests++;
      const status = options.tokenStatus ?? 200;
      return Promise.resolve(
        status === 200
          ? jsonResponse({ access_token: `token-${tokenRequests}`, expires_in: 3600 })
          : jsonResponse({ error: 'server_error' }, { status }),
      );
    }

    const query: SearchQuery = {
      isrc: (url.searchParams.get('q') ?? '').replace('isrc:', ''),
      market: url.searchParams.get('market'),
    };
    searches.push(query);
    const answer = options.search(query);
    return Promise.resolve(
      answer instanceof Response ? answer : jsonResponse({ tracks: { items: answer } }),
    );
  };

  return { fetchFn, tokenRequests: () => tokenRequests, searches };
}

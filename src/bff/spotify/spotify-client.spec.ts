// @vitest-environment node
import { spotifyTrack } from '../testing/builders';
import { jsonResponse } from '../testing/fake-spotify';
import { SpotifyClient } from './spotify-client';
import { SpotifyUnavailableError } from './spotify-errors';
import { AccessTokenProvider } from './token-provider';

function setup(responses: (() => Response | Promise<Response>)[]) {
  let issued = 0;
  const tokens: AccessTokenProvider = {
    getToken: vi.fn(async () => `token-${++issued}`),
    invalidate: vi.fn(),
  };
  const fetchFn = vi.fn<typeof fetch>();
  for (const respond of responses) {
    fetchFn.mockImplementationOnce(async () => respond());
  }
  const sleep = vi.fn(async () => undefined);
  const client = new SpotifyClient(tokens, { fetchFn, sleep });
  return { client, tokens, fetchFn, sleep };
}

const ok =
  (...tracks: ReturnType<typeof spotifyTrack>[]) =>
  () =>
    jsonResponse({ tracks: { items: tracks } });
const failure = (status: number, headers?: Record<string, string>) => () =>
  new Response('', { status, headers });

describe('SpotifyClient.searchByIsrc', () => {
  it('searches tracks by ISRC with the bearer token and the API limit of 10', async () => {
    const track = spotifyTrack();
    const { client, fetchFn } = setup([ok(track)]);

    await expect(client.searchByIsrc('BR1SP1200071', { market: 'BR' })).resolves.toEqual([track]);

    const [url, init] = fetchFn.mock.calls[0];
    const params = new URL(String(url)).searchParams;
    expect(new URL(String(url)).origin + new URL(String(url)).pathname).toBe(
      'https://api.spotify.com/v1/search',
    );
    expect(params.get('q')).toBe('isrc:BR1SP1200071');
    expect(params.get('type')).toBe('track');
    expect(params.get('limit')).toBe('10');
    expect(params.get('market')).toBe('BR');
    expect((init?.headers as Record<string, string>)['Authorization']).toBe('Bearer token-1');
  });

  it('omits the market parameter when none is given', async () => {
    const { client, fetchFn } = setup([ok()]);

    await client.searchByIsrc('BR1SP1200071');

    expect(new URL(String(fetchFn.mock.calls[0][0])).searchParams.has('market')).toBe(false);
  });

  it('returns an empty list when Spotify has no match', async () => {
    const { client } = setup([ok()]);

    await expect(client.searchByIsrc('BR1SP1200071')).resolves.toEqual([]);
  });

  describe('401 Unauthorized', () => {
    it('drops the token and retries once with a fresh one', async () => {
      const track = spotifyTrack();
      const { client, tokens, fetchFn } = setup([failure(401), ok(track)]);

      await expect(client.searchByIsrc('BR1SP1200071')).resolves.toEqual([track]);

      expect(tokens.invalidate).toHaveBeenCalledTimes(1);
      expect((fetchFn.mock.calls[1][1]?.headers as Record<string, string>)['Authorization']).toBe(
        'Bearer token-2',
      );
    });

    it('gives up if the fresh token is rejected too', async () => {
      const { client, fetchFn } = setup([failure(401), failure(401)]);

      await expect(client.searchByIsrc('BR1SP1200071')).rejects.toMatchObject({
        reason: 'search_failed_401',
      });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('429 Too Many Requests', () => {
    it('waits for Retry-After and retries once', async () => {
      const track = spotifyTrack();
      const { client, sleep } = setup([failure(429, { 'Retry-After': '2' }), ok(track)]);

      await expect(client.searchByIsrc('BR1SP1200071')).resolves.toEqual([track]);

      expect(sleep).toHaveBeenCalledExactlyOnceWith(2000);
    });

    it('fails fast when the wait is too long to hold a user request', async () => {
      const { client, sleep } = setup([failure(429, { 'Retry-After': '30' })]);

      await expect(client.searchByIsrc('BR1SP1200071')).rejects.toMatchObject({
        reason: 'search_failed_429',
      });
      expect(sleep).not.toHaveBeenCalled();
    });

    it('fails when Retry-After is missing or invalid', async () => {
      const { client } = setup([failure(429), failure(429, { 'Retry-After': 'soon' })]);

      await expect(client.searchByIsrc('A')).rejects.toMatchObject({ reason: 'search_failed_429' });
      await expect(client.searchByIsrc('A')).rejects.toMatchObject({ reason: 'search_failed_429' });
    });

    it('retries only once', async () => {
      const { client, sleep, fetchFn } = setup([
        failure(429, { 'Retry-After': '1' }),
        failure(429, { 'Retry-After': '1' }),
      ]);

      await expect(client.searchByIsrc('BR1SP1200071')).rejects.toMatchObject({
        reason: 'search_failed_429',
      });
      expect(sleep).toHaveBeenCalledTimes(1);
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  it.each([400, 403, 500, 503])(
    'maps HTTP %i to an unavailable-integration error',
    async (status) => {
      const { client } = setup([failure(status)]);

      await expect(client.searchByIsrc('BR1SP1200071')).rejects.toMatchObject({
        name: 'SpotifyUnavailableError',
        reason: `search_failed_${status}`,
      });
    },
  );

  it('wraps network errors', async () => {
    const { client } = setup([() => Promise.reject(new TypeError('fetch failed'))]);

    const error = await client.searchByIsrc('BR1SP1200071').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(SpotifyUnavailableError);
    expect((error as SpotifyUnavailableError).reason).toBe('search_network_error');
  });

  it.each([
    ['not JSON', () => new Response('oops', { status: 200 })],
    ['no tracks object', () => jsonResponse({})],
    ['items is not a list', () => jsonResponse({ tracks: { items: null } })],
  ])('rejects a malformed payload (%s)', async (_label, respond) => {
    const { client } = setup([respond]);

    await expect(client.searchByIsrc('BR1SP1200071')).rejects.toMatchObject({
      reason: 'search_response_malformed',
    });
  });
});

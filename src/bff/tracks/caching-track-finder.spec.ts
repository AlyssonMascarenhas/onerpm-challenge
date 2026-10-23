import { ReleaseDatePrecision } from '../../contract/tracks.enums';
// @vitest-environment node
import { Track } from '../../contract/tracks.interfaces';
import { CachingTrackFinder } from './caching-track-finder';
import { TrackFinder } from './tracks.interfaces';

const track = (isrc: string): Track => ({
  id: `id-${isrc}`,
  isrc,
  title: 'Title',
  artists: ['Artist'],
  albumName: 'Album',
  coverUrl: null,
  releaseDate: { value: '2020', precision: ReleaseDatePrecision.YEAR },
  durationMs: 1000,
  spotifyUrl: 'https://open.spotify.com/track/x',
  availableInBR: true,
});

function setup(options: { ttlMs?: number; maxEntries?: number } = {}) {
  const clock = { now: 0 };
  const inner = { findByIsrc: vi.fn<TrackFinder['findByIsrc']>(async (isrc) => track(isrc)) };
  const cache = new CachingTrackFinder(inner, {
    ttlMs: options.ttlMs ?? 1000,
    maxEntries: options.maxEntries ?? 100,
    now: () => clock.now,
  });
  return { cache, inner, clock };
}

describe('CachingTrackFinder', () => {
  it('serves repeated lookups from memory within the TTL', async () => {
    const { cache, inner, clock } = setup({ ttlMs: 1000 });

    const first = await cache.findByIsrc('A');
    clock.now = 999;
    const second = await cache.findByIsrc('A');

    expect(second).toBe(first);
    expect(inner.findByIsrc).toHaveBeenCalledTimes(1);
  });

  it('looks up again once the TTL has elapsed', async () => {
    const { cache, inner, clock } = setup({ ttlMs: 1000 });

    await cache.findByIsrc('A');
    clock.now = 1000;
    await cache.findByIsrc('A');

    expect(inner.findByIsrc).toHaveBeenCalledTimes(2);
  });

  it('keeps ISRCs apart', async () => {
    const { cache, inner } = setup();

    await cache.findByIsrc('A');
    await cache.findByIsrc('B');

    expect(inner.findByIsrc).toHaveBeenCalledTimes(2);
  });

  it('caches "not found" too, so unknown ISRCs do not hammer Spotify', async () => {
    const { cache, inner } = setup();
    inner.findByIsrc.mockResolvedValue(null);

    await cache.findByIsrc('A');
    await expect(cache.findByIsrc('A')).resolves.toBeNull();

    expect(inner.findByIsrc).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight lookup between concurrent callers', async () => {
    const { cache, inner } = setup();

    await Promise.all([cache.findByIsrc('A'), cache.findByIsrc('A'), cache.findByIsrc('A')]);

    expect(inner.findByIsrc).toHaveBeenCalledTimes(1);
  });

  it('never caches failures', async () => {
    const { cache, inner } = setup();
    inner.findByIsrc.mockRejectedValueOnce(new Error('down'));

    await expect(cache.findByIsrc('A')).rejects.toThrow('down');
    await expect(cache.findByIsrc('A')).resolves.toMatchObject({ isrc: 'A' });

    expect(inner.findByIsrc).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest entry beyond maxEntries', async () => {
    const { cache, inner } = setup({ maxEntries: 2 });

    await cache.findByIsrc('A');
    await cache.findByIsrc('B');
    await cache.findByIsrc('C'); // evicts A
    await cache.findByIsrc('B'); // still cached
    await cache.findByIsrc('A'); // looked up again

    expect(inner.findByIsrc.mock.calls.map(([isrc]) => isrc)).toEqual(['A', 'B', 'C', 'A']);
  });
});

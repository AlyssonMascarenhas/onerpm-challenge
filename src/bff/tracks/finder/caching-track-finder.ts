import { Track } from '../../../contract/tracks.interfaces';
import { systemClock } from '../../shared/system-time';
import { Clock } from '../../shared/shared.types';
import { CacheEntry, CachingOptions, TrackFinder } from './finder.interfaces';

/**
 * Short-lived in-memory cache (Decorator). It only shields Spotify's rate limits and
 * de-duplicates concurrent lookups; nothing is persisted. Failures are never cached.
 */
export class CachingTrackFinder implements TrackFinder {
  private readonly _entries = new Map<string, CacheEntry>();
  private readonly _now: Clock;

  constructor(
    private readonly _inner: TrackFinder,
    private readonly _options: CachingOptions,
  ) {
    this._now = _options.now ?? systemClock;
  }

  public findByIsrc(isrc: string): Promise<Track | null> {
    const cached = this._entries.get(isrc);
    if (cached && cached.expiresAt > this._now()) {
      return cached.result;
    }

    const result = this._inner.findByIsrc(isrc);
    this._store(isrc, { result, expiresAt: this._now() + this._options.ttlMs });
    result.catch(() => {
      if (this._entries.get(isrc)?.result === result) {
        this._entries.delete(isrc);
      }
    });
    return result;
  }

  private _store(isrc: string, entry: CacheEntry): void {
    this._entries.delete(isrc);
    this._entries.set(isrc, entry);
    if (this._entries.size > this._options.maxEntries) {
      const oldest = this._entries.keys().next().value;
      if (oldest !== undefined) {
        this._entries.delete(oldest);
      }
    }
  }
}

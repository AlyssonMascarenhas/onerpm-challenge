import { Track } from '../../contract/tracks';
import { Clock, systemClock } from '../spotify/http';
import { TrackFinder } from './track-finder';

export interface CachingOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly now?: Clock;
}

interface Entry {
  readonly result: Promise<Track | null>;
  readonly expiresAt: number;
}

/**
 * Short-lived in-memory cache (Decorator). It only shields Spotify's rate limits and
 * de-duplicates concurrent lookups; nothing is persisted. Failures are never cached.
 */
export class CachingTrackFinder implements TrackFinder {
  private readonly entries = new Map<string, Entry>();
  private readonly now: Clock;

  constructor(
    private readonly inner: TrackFinder,
    private readonly options: CachingOptions,
  ) {
    this.now = options.now ?? systemClock;
  }

  findByIsrc(isrc: string): Promise<Track | null> {
    const cached = this.entries.get(isrc);
    if (cached && cached.expiresAt > this.now()) {
      return cached.result;
    }

    const result = this.inner.findByIsrc(isrc);
    this.store(isrc, { result, expiresAt: this.now() + this.options.ttlMs });
    result.catch(() => {
      if (this.entries.get(isrc)?.result === result) {
        this.entries.delete(isrc);
      }
    });
    return result;
  }

  private store(isrc: string, entry: Entry): void {
    this.entries.delete(isrc);
    this.entries.set(isrc, entry);
    if (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) {
        this.entries.delete(oldest);
      }
    }
  }
}

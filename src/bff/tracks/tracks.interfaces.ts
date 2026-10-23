import { Track } from '../../contract/tracks.interfaces';
import { Clock } from '../spotify/http.types';

/** Resolves an ISRC to a track, or `null` when Spotify has none. Rejects when the integration is down. */
export interface TrackFinder {
  findByIsrc(isrc: string): Promise<Track | null>;
}

export interface TrackContext {
  /** The ISRC that was searched (normalized), used as the track's identity for the UI. */
  readonly isrc: string;
  readonly availableInBR: boolean;
}

export interface CachingOptions {
  readonly ttlMs: number;
  readonly maxEntries: number;
  readonly now?: Clock;
}

export interface CacheEntry {
  readonly result: Promise<Track | null>;
  readonly expiresAt: number;
}

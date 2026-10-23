import { TrackLookupResult } from '../../contract/tracks';
import { mapWithConcurrency } from '../shared/map-with-concurrency';
import { SpotifyUnavailableError } from '../spotify/spotify-errors';
import { TrackFinder } from './track-finder';

const DEFAULT_CONCURRENCY = 5;

export interface Logger {
  warn(message: string, ...details: unknown[]): void;
  error(message: string, ...details: unknown[]): void;
}

/** Looks up many ISRCs, isolating failures so one bad ISRC never hides the others. */
export class TracksService {
  constructor(
    private readonly finder: TrackFinder,
    private readonly logger: Logger,
    private readonly concurrency = DEFAULT_CONCURRENCY,
  ) {}

  lookup(isrcs: readonly string[]): Promise<TrackLookupResult[]> {
    return mapWithConcurrency(isrcs, this.concurrency, (isrc) => this.lookupOne(isrc));
  }

  private async lookupOne(isrc: string): Promise<TrackLookupResult> {
    try {
      const track = await this.finder.findByIsrc(isrc);
      return track ? { status: 'found', isrc, track } : { status: 'not_found', isrc };
    } catch (error) {
      if (error instanceof SpotifyUnavailableError) {
        this.logger.warn(`Lookup of ${isrc} failed: ${error.reason}`);
        return { status: 'error', isrc, code: 'integration_unavailable' };
      }
      this.logger.error(`Unexpected error looking up ${isrc}`, error);
      return { status: 'error', isrc, code: 'internal_error' };
    }
  }
}

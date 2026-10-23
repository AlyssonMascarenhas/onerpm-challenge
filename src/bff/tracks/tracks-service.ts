import { LookupErrorCode, LookupStatus } from '../../contract/tracks.enums';
import { TrackLookupResult } from '../../contract/tracks.types';
import { Logger } from '../shared/shared.interfaces';
import { mapWithConcurrency } from '../shared/map-with-concurrency';
import { SpotifyUnavailableError } from '../spotify/spotify-errors';
import { DEFAULT_LOOKUP_CONCURRENCY } from './tracks.constants';
import { TrackFinder } from './tracks.interfaces';

/** Looks up many ISRCs, isolating failures so one bad ISRC never hides the others. */
export class TracksService {
  constructor(
    private readonly _finder: TrackFinder,
    private readonly _logger: Logger,
    private readonly _concurrency = DEFAULT_LOOKUP_CONCURRENCY,
  ) {}

  public lookup(isrcs: readonly string[]): Promise<TrackLookupResult[]> {
    return mapWithConcurrency(isrcs, this._concurrency, (isrc) => this._lookupOne(isrc));
  }

  private async _lookupOne(isrc: string): Promise<TrackLookupResult> {
    try {
      const track = await this._finder.findByIsrc(isrc);
      return track
        ? { status: LookupStatus.FOUND, isrc, track }
        : { status: LookupStatus.NOT_FOUND, isrc };
    } catch (error) {
      if (error instanceof SpotifyUnavailableError) {
        this._logger.warn(`Lookup of ${isrc} failed: ${error.message}`);
        return {
          status: LookupStatus.ERROR,
          isrc,
          code: LookupErrorCode.INTEGRATION_UNAVAILABLE,
        };
      }
      this._logger.error(`Unexpected error looking up ${isrc}`, error);
      return { status: LookupStatus.ERROR, isrc, code: LookupErrorCode.INTERNAL_ERROR };
    }
  }
}

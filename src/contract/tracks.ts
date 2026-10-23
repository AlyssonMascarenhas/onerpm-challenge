/**
 * Contract shared by the BFF (`src/bff`) and the Angular app. Types only: it must
 * stay free of runtime dependencies on either side.
 */

export type ReleaseDatePrecision = 'year' | 'month' | 'day';

export interface ReleaseDate {
  /** ISO-like value whose shape follows `precision`: `YYYY`, `YYYY-MM` or `YYYY-MM-DD`. */
  readonly value: string;
  readonly precision: ReleaseDatePrecision;
}

export interface Track {
  readonly id: string;
  readonly isrc: string;
  readonly title: string;
  readonly artists: readonly string[];
  readonly albumName: string;
  readonly coverUrl: string | null;
  readonly releaseDate: ReleaseDate;
  readonly durationMs: number;
  readonly spotifyUrl: string;
  readonly availableInBR: boolean;
}

export type LookupErrorCode = 'integration_unavailable' | 'internal_error';

export type TrackLookupResult =
  | { readonly status: 'found'; readonly isrc: string; readonly track: Track }
  | { readonly status: 'not_found'; readonly isrc: string }
  | { readonly status: 'error'; readonly isrc: string; readonly code: LookupErrorCode };

export interface TracksResponse {
  readonly results: readonly TrackLookupResult[];
}

export type ApiErrorCode =
  'invalid_isrc' | 'too_many_isrcs' | 'integration_unavailable' | 'internal_error' | 'not_found';

export interface ApiError {
  readonly code: ApiErrorCode;
  readonly message: string;
  /** Offending values, only present for `invalid_isrc`. */
  readonly invalid?: readonly string[];
}

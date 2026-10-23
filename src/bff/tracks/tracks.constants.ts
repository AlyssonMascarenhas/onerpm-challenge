/** Availability is judged for Brazil only (see ADR 0005). */
export const BRAZIL_MARKET = 'BR';

/** Thumbnail size we render; the API offers 640/300/64. */
export const PREFERRED_COVER_WIDTH = 300;

/** Lookups run in parallel, but never more than this many per request. */
export const DEFAULT_LOOKUP_CONCURRENCY = 5;

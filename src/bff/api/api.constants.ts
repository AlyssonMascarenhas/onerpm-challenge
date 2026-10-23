export const MAX_ISRCS_PER_REQUEST = 20;

/** Browsers may reuse a response briefly; the server-side cache is the one that matters. */
export const CACHE_CONTROL_PUBLIC = 'public, max-age=60';
export const CACHE_CONTROL_NO_STORE = 'no-store';

/** Server-side cache of resolved tracks. In memory only: nothing is persisted. */
export const TRACK_CACHE_TTL_MS = 5 * 60_000;
export const TRACK_CACHE_MAX_ENTRIES = 500;

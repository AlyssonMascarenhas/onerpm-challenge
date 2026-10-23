import { LookupStatus } from '../../../contract/tracks.enums';

/** The ISRCs from the challenge statement, missing from our databases, in the order they were given. */
export const CHALLENGE_ISRCS: readonly string[] = [
  'NO1R42509310',
  'NO1R42511410',
  'BRC310600002',
  'BR1SP1200071',
  'BR1SP1200070',
  'BR1SP1500002',
  'BXKZM1900338',
  'BXKZM1900345',
  'QZNJX2081700',
  'QZNJX2078148',
];

export const TRACKS_API_URL = '/api/tracks';
export const ISRC_QUERY_PARAM = 'isrc';

/** A hung BFF must surface as "unavailable" instead of an endless spinner. */
export const TRACKS_REQUEST_TIMEOUT_MS = 20_000;

/**
 * Titles are compared with one fixed, explicitly supported locale, never the UI language nor the
 * runtime default: the order must not change when the visitor switches language, nor differ
 * between the server render and the browser (Latin sorts before Cyrillic, `Ä` next to `A`).
 *
 * `en` has no collation tailoring, so it yields the CLDR root order. Do not use `und`: it is
 * not a supported locale, so `Intl.Collator` silently falls back to the runtime default
 * (with `ru` Cyrillic would sort first, with `sv` `Ä` would sort after `Z`).
 */
export const TITLE_SORT_LOCALE = 'en';

/** Where each kind of result lands in the list: real tracks first, then the ones we could not show. */
export const RESULT_ORDER: Readonly<Record<LookupStatus, number>> = {
  [LookupStatus.FOUND]: 0,
  [LookupStatus.NOT_FOUND]: 1,
  [LookupStatus.ERROR]: 2,
};

export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;

/** Shown when a duration is missing or invalid, so the layout never breaks. */
export const ZERO_DURATION = '00:00';

/** Spotify's official embedded player. Only this origin is ever put in an `<iframe src>`. */
export const SPOTIFY_EMBED_URL = 'https://open.spotify.com/embed/track';

/** Spotify's official iFrame API, which can start the embedded player by code. Loaded only after a click. */
export const SPOTIFY_IFRAME_API_URL = 'https://open.spotify.com/embed/iframe-api/v1';

/** How long to wait for Spotify's script before giving up on it and using the plain embed. */
export const SPOTIFY_IFRAME_API_TIMEOUT_MS = 10_000;

/** What comes before the id in the address the iFrame API plays. */
export const SPOTIFY_TRACK_URI_PREFIX = 'spotify:track:';

/** Spotify track ids are 22 base-62 characters. Anything else is never turned into a URL. */
export const SPOTIFY_TRACK_ID_PATTERN = /^[A-Za-z0-9]{22}$/;

/** Height of Spotify's slimmest player (cover, title, artist and play control): it fits a bar. */
export const SPOTIFY_EMBED_HEIGHT = 80;

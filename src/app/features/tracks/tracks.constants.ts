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
 * Titles are compared with the root collation, not the UI language: the order must not change
 * when the visitor switches language (Latin always sorts before Cyrillic, for instance).
 */
export const TITLE_SORT_LOCALE = 'und';

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

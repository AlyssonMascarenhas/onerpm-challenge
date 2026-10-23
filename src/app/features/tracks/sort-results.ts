import { LookupStatus } from '../../../contract/tracks.enums';
import { TrackLookupResult } from '../../../contract/tracks.types';
import { RESULT_ORDER, TITLE_SORT_LOCALE } from './tracks.constants';

/**
 * Orders the page: found tracks alphabetically by title, then ISRCs Spotify does not know,
 * then ISRCs that failed (both by ISRC, since they have no title).
 *
 * Titles ignore case, accents and punctuation, so "...É pra Você" files under E, and digits
 * compare as numbers ("Track 2" before "Track 10"). Equal titles keep their input order.
 */
export function sortResults(
  results: readonly TrackLookupResult[],
  locale: string = TITLE_SORT_LOCALE,
): TrackLookupResult[] {
  const collator = new Intl.Collator(locale, {
    sensitivity: 'base',
    numeric: true,
    ignorePunctuation: true,
  });

  return [...results].sort((a, b) => {
    const byKind = RESULT_ORDER[a.status] - RESULT_ORDER[b.status];
    if (byKind !== 0) {
      return byKind;
    }
    if (a.status === LookupStatus.FOUND && b.status === LookupStatus.FOUND) {
      return collator.compare(a.track.title, b.track.title);
    }
    return a.isrc.localeCompare(b.isrc);
  });
}

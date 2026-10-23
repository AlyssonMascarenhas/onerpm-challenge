import { isValidIsrc, normalizeIsrc } from '../../contract/isrc';

export const MAX_ISRCS_PER_REQUEST = 20;

export type IsrcQuery =
  | { readonly kind: 'ok'; readonly isrcs: readonly string[] }
  | { readonly kind: 'invalid'; readonly invalid: readonly string[] }
  | { readonly kind: 'too_many' };

/** Accepts `?isrc=A,B` and/or repeated `?isrc=A&isrc=B`; normalizes and de-duplicates preserving order. */
export function parseIsrcQuery(raw: unknown): IsrcQuery {
  const values = (Array.isArray(raw) ? raw : [raw]).filter(
    (value): value is string => typeof value === 'string',
  );
  const candidates = values
    .flatMap((value) => value.split(','))
    .map(normalizeIsrc)
    .filter((value) => value.length > 0);

  if (candidates.length === 0) {
    return { kind: 'invalid', invalid: [] };
  }
  const invalid = candidates.filter((candidate) => !isValidIsrc(candidate));
  if (invalid.length > 0) {
    return { kind: 'invalid', invalid };
  }

  const isrcs = [...new Set(candidates)];
  return isrcs.length > MAX_ISRCS_PER_REQUEST ? { kind: 'too_many' } : { kind: 'ok', isrcs };
}

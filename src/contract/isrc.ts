import { ISRC_PATTERN } from './isrc.constants';

/** Strips hyphens/spaces and upper-cases, so `br-sp1-20-00071` and `BRSP1200071` compare equal. */
export function normalizeIsrc(raw: string): string {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidIsrc(value: string): boolean {
  return ISRC_PATTERN.test(value);
}

import { SPOTIFY_EMBED_URL, SPOTIFY_TRACK_ID_PATTERN } from './tracks.constants';

/**
 * URL of Spotify's embedded player for a track, or `null` when the id does not look like a Spotify
 * id. The id is validated before it becomes part of a URL that the page then trusts as an iframe
 * source, so a malformed value can never inject anything.
 */
export function buildEmbedUrl(trackId: string, dark: boolean): string | null {
  if (!SPOTIFY_TRACK_ID_PATTERN.test(trackId)) {
    return null;
  }
  return `${SPOTIFY_EMBED_URL}/${trackId}${dark ? '?theme=0' : ''}`;
}

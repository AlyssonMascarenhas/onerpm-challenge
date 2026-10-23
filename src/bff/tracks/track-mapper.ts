import { Track } from '../../contract/tracks';
import { SpotifyImage, SpotifyTrack } from '../spotify/spotify.types';

/** Thumbnail size we render; the API offers 640/300/64. */
const PREFERRED_COVER_WIDTH = 300;

export interface TrackContext {
  /** The ISRC that was searched (normalized), used as the track's identity for the UI. */
  readonly isrc: string;
  readonly availableInBR: boolean;
}

/** Anti-corruption layer: the only place that knows Spotify's payload shape. */
export function toTrack(dto: SpotifyTrack, context: TrackContext): Track {
  return {
    id: dto.id,
    isrc: context.isrc,
    title: dto.name,
    artists: dto.artists.map((artist) => artist.name),
    albumName: dto.album.name,
    coverUrl: pickCoverUrl(dto.album.images),
    releaseDate: { value: dto.album.release_date, precision: dto.album.release_date_precision },
    durationMs: dto.duration_ms,
    spotifyUrl: dto.external_urls.spotify,
    availableInBR: context.availableInBR,
  };
}

function pickCoverUrl(images: readonly SpotifyImage[]): string | null {
  const distance = (image: SpotifyImage) =>
    image.width === null ? Number.POSITIVE_INFINITY : Math.abs(image.width - PREFERRED_COVER_WIDTH);

  const best = [...images].sort((a, b) => distance(a) - distance(b))[0];
  return best?.url ?? null;
}

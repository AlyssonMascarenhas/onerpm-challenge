/** Subset of the Spotify Web API payloads the BFF actually reads. */

export interface SpotifyImage {
  readonly url: string;
  readonly width: number | null;
  readonly height: number | null;
}

export interface SpotifyArtist {
  readonly id: string;
  readonly name: string;
}

export interface SpotifyAlbum {
  readonly name: string;
  readonly images: readonly SpotifyImage[];
  readonly release_date: string;
  readonly release_date_precision: 'year' | 'month' | 'day';
}

export interface SpotifyTrack {
  readonly id: string;
  readonly name: string;
  readonly artists: readonly SpotifyArtist[];
  readonly album: SpotifyAlbum;
  readonly duration_ms: number;
  readonly external_urls: { readonly spotify: string };
  /** Present when the request carried a `market` (or the API resolved one). */
  readonly is_playable?: boolean;
}

export interface SpotifySearchResponse {
  readonly tracks: { readonly items: readonly SpotifyTrack[] };
}

export interface SpotifyTokenResponse {
  readonly access_token: string;
  readonly expires_in: number;
}

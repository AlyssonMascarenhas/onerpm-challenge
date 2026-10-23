/** Subset of the Spotify Web API payloads the BFF reads, plus the ports of the Spotify adapters. */
import { ReleaseDatePrecision } from '../../contract/tracks.enums';
import { Clock, FetchFn, Sleep } from './http.types';

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
  readonly release_date_precision: ReleaseDatePrecision;
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

export interface SpotifyCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface AccessTokenProvider {
  getToken(): Promise<string>;
  /** Drops the cached token (e.g. after a 401) so the next call fetches a new one. */
  invalidate(): void;
}

export interface TokenProviderOptions {
  readonly fetchFn?: FetchFn;
  readonly now?: Clock;
}

export interface CachedToken {
  readonly value: string;
  readonly expiresAt: number;
}

export interface SearchOptions {
  readonly market?: string;
}

/** Port the track finder depends on; the HTTP client is one adapter for it. */
export interface TrackSearch {
  searchByIsrc(isrc: string, options?: SearchOptions): Promise<readonly SpotifyTrack[]>;
}

export interface SpotifyClientOptions {
  readonly fetchFn?: FetchFn;
  readonly sleep?: Sleep;
}

export interface SpotifyErrorDetails extends ErrorOptions {
  /** HTTP status of the failed response, when there was one. */
  readonly status?: number;
}

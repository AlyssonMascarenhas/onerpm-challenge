import { SpotifyEmbedEvent } from './spotify.enums';

/** What the page uses of the controller Spotify's iFrame API returns for an embedded player. */
export interface SpotifyEmbedController {
  loadUri(uri: string): void;
  play(): void;
  destroy(): void;
  addListener(event: SpotifyEmbedEvent, listener: () => void): void;
}

export interface SpotifyEmbedOptions {
  readonly uri: string;
  readonly width: string;
  readonly height: number;
}

/** The API object Spotify's script hands to `onSpotifyIframeApiReady`. */
export interface SpotifyIframeApiObject {
  /** Replaces `element` with the player and calls back with its controller. */
  createController(
    element: HTMLElement,
    options: SpotifyEmbedOptions,
    callback: (controller: SpotifyEmbedController) => void,
  ): void;
}

/** The window, with the hook Spotify's script calls once it is ready. */
export interface SpotifyWindow extends Window {
  onSpotifyIframeApiReady?: (api: SpotifyIframeApiObject) => void;
}

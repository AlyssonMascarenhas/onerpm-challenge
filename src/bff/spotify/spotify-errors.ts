/** The Spotify integration cannot serve the request (network, auth, rate limit, bad payload, missing config). */
export class SpotifyUnavailableError extends Error {
  override readonly name = 'SpotifyUnavailableError';

  constructor(
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`Spotify integration unavailable: ${reason}`, options);
  }
}

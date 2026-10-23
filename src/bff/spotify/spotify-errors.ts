import { SpotifyFailureReason } from './spotify.enums';
import { SpotifyErrorDetails } from './spotify.interfaces';

/** The Spotify integration cannot serve the request (network, auth, rate limit, bad payload, missing config). */
export class SpotifyUnavailableError extends Error {
  public override readonly name = 'SpotifyUnavailableError';
  public readonly status?: number;

  constructor(
    public readonly reason: SpotifyFailureReason,
    details: SpotifyErrorDetails = {},
  ) {
    super(
      `Spotify integration unavailable: ${reason}${details.status ? ` (HTTP ${details.status})` : ''}`,
      { cause: details.cause },
    );
    this.status = details.status;
  }
}

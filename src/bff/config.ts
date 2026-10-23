import { SpotifyCredentials } from './spotify/token-provider';

/** Returns the Spotify credentials, or `null` when they are not configured. */
export function readSpotifyCredentials(env: NodeJS.ProcessEnv): SpotifyCredentials | null {
  const clientId = env['SPOTIFY_CLIENT_ID']?.trim();
  const clientSecret = env['SPOTIFY_CLIENT_SECRET']?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Local development convenience: loads `.env` when present. Production uses real environment variables. */
export function loadLocalEnvFile(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: nothing to load.
  }
}

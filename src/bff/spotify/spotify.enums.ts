/** Stable, machine-readable causes for `SpotifyUnavailableError`. */
export enum SpotifyFailureReason {
  MISSING_CREDENTIALS = 'missing_credentials',
  TOKEN_REQUEST_FAILED = 'token_request_failed',
  TOKEN_REQUEST_NETWORK_ERROR = 'token_request_network_error',
  TOKEN_RESPONSE_MALFORMED = 'token_response_malformed',
  SEARCH_FAILED = 'search_failed',
  SEARCH_NETWORK_ERROR = 'search_network_error',
  SEARCH_RESPONSE_MALFORMED = 'search_response_malformed',
}

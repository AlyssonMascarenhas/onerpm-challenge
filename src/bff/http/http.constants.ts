/**
 * Headers every response carries. The Content-Security-Policy here is deliberately partial: it holds the
 * directives that need no list of sources (the page needs inline scripts for hydration and the theme, and
 * Spotify's player and script, so a `script-src` would need nonces: see ADR 0019).
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy':
    "base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'self'",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

/** Sent only on HTTPS: 180 days, for this host only (not its subdomains, which may serve other things). */
export const HSTS_HEADER = 'Strict-Transport-Security';
export const HSTS_VALUE = 'max-age=15552000';

/** Set by the proxy or load balancer in front of the server when the visitor used HTTPS. */
export const FORWARDED_PROTO_HEADER = 'x-forwarded-proto';

import { Request, RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import {
  FORWARDED_PROTO_HEADER,
  HSTS_HEADER,
  HSTS_VALUE,
  PAGE_BASE_DIRECTIVES,
  SCRIPT_SOURCES,
  SECURITY_HEADERS,
} from './http.constants';

/** The visitor reached us over HTTPS, directly or through a proxy that says so. */
function isSecure(request: Request): boolean {
  const forwarded = request.headers[FORWARDED_PROTO_HEADER];
  const protocol = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return request.secure || protocol?.split(',')[0].trim() === 'https';
}

/** Adds the security headers to every response (and HSTS when the request came over HTTPS). */
export function securityHeaders(): RequestHandler {
  return (request, response, next) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      response.setHeader(name, value);
    }
    if (isSecure(request)) {
      response.setHeader(HSTS_HEADER, HSTS_VALUE);
    }
    next();
  };
}

/** A fresh, unguessable value for one response: only scripts that carry it may run (see `buildContentSecurityPolicy`). */
export function createNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * The policy of a page: the base directives and a `script-src` that allows the page's own scripts, the ones that carry
 * `nonce` (the inline scripts of the server render and the theme script) and Spotify's iFrame API. An inline script
 * injected by someone else has no nonce, so the browser refuses it. Styles are not restricted (the components and PrimeNG
 * write their own).
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const scriptSources = ["'self'", `'nonce-${nonce}'`, ...SCRIPT_SOURCES].join(' ');
  return `${PAGE_BASE_DIRECTIVES}; script-src ${scriptSources}`;
}

/**
 * Puts the nonce on the inline scripts of a page that are code and do not have it yet: the script of `index.html` that
 * applies the theme before the first paint, and the one of the event replay that the build adds to it. Scripts with a
 * `src` are covered by `'self'`, and a JSON script (the state of the page) is data that the browser never runs.
 */
export function addNonceToInlineScripts(html: string, nonce: string): string {
  return html.replace(/<script((?:\s[^>]*)?)>/g, (tag: string, attributes: string) =>
    /\s(src|nonce)=|application\/json/.test(attributes)
      ? tag
      : `<script${attributes} nonce="${nonce}">`,
  );
}

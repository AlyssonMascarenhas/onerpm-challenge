import { Request, RequestHandler } from 'express';
import {
  FORWARDED_PROTO_HEADER,
  HSTS_HEADER,
  HSTS_VALUE,
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

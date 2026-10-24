// @vitest-environment node
import express from 'express';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { HSTS_HEADER, SECURITY_HEADERS } from './http.constants';
import { securityHeaders } from './security-headers';

let server: Server;

async function get(headers: Record<string, string> = {}): Promise<Response> {
  const app = express();
  app.use(securityHeaders());
  app.get('/', (_request, response) => {
    response.send('ok');
  });
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const { port } = server.address() as AddressInfo;
  return fetch(`http://127.0.0.1:${port}/`, { headers });
}

describe('securityHeaders', () => {
  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('adds every security header to the response', async () => {
    const response = await get();

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name), name).toBe(value);
    }
  });

  it('does not let the page be framed by another site, or sniffed into another type', async () => {
    const response = await get();

    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'self'");
  });

  it('denies the browser features the page never uses', async () => {
    const response = await get();

    const policy = response.headers.get('permissions-policy') ?? '';
    for (const feature of ['camera', 'microphone', 'geolocation']) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  it('does not restrict scripts, which the page and the Spotify player need', async () => {
    const response = await get();

    expect(response.headers.get('content-security-policy')).not.toContain('script-src');
    expect(response.headers.get('content-security-policy')).not.toContain('default-src');
  });

  it('does not send HSTS over plain HTTP', async () => {
    const response = await get();

    expect(response.headers.get(HSTS_HEADER)).toBeNull();
  });

  it('sends HSTS when a proxy says the visitor used HTTPS', async () => {
    const response = await get({ 'X-Forwarded-Proto': 'https' });

    expect(response.headers.get(HSTS_HEADER)).toBe('max-age=15552000');
  });

  it('reads the first protocol of a chain of proxies', async () => {
    const secure = await get({ 'X-Forwarded-Proto': 'https, http' });
    expect(secure.headers.get(HSTS_HEADER)).not.toBeNull();
    await new Promise((resolve) => server.close(resolve));

    const insecure = await get({ 'X-Forwarded-Proto': 'http, https' });
    expect(insecure.headers.get(HSTS_HEADER)).toBeNull();
  });

  it('lets the request go on to the next handler', async () => {
    const response = await get();

    expect(await response.text()).toBe('ok');
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SECURITY_HEADERS } from './bff/http/http.constants';

/**
 * Vercel serves the static files from its CDN and runs the Angular SSR server as one function. Neither the CDN
 * headers nor the entry point are exercised by any other test, so these keep \`vercel.json\`, the entry file and
 * the rest of the project saying the same thing (ADR 0021).
 */
const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

interface VercelHeader {
  readonly key: string;
  readonly value: string;
}
interface VercelConfig {
  readonly framework: string | null;
  readonly installCommand: string;
  readonly buildCommand: string;
  readonly outputDirectory: string;
  readonly git: { readonly deploymentEnabled: boolean };
  readonly rewrites: readonly { readonly source: string; readonly destination: string }[];
  readonly functions: Record<string, { readonly includeFiles?: string }>;
  readonly headers: readonly {
    readonly source: string;
    readonly headers: readonly VercelHeader[];
  }[];
}

const config = JSON.parse(read('vercel.json')) as VercelConfig;
/** Angular writes the build to `dist/<project name>` unless told otherwise (angular.json sets no `outputPath`). */
const angularJson = JSON.parse(read('angular.json')) as {
  projects: Record<string, { architect: { build: { options: { outputPath?: string } } } }>;
};
const [project] = Object.keys(angularJson.projects);
const outputPath = project; // `dist/<project>` is where the build, the entry and vercel.json meet

describe('vercel.json', () => {
  it('builds with the same command as everywhere else, with no framework preset', () => {
    expect(config.framework).toBeNull();
    expect(config.buildCommand).toBe('npm run build');
  });

  it('installs with the npm version pinned in package.json: the lockfile is not valid for every npm', () => {
    const { packageManager } = JSON.parse(read('package.json')) as { packageManager: string };
    const [, npmVersion] = packageManager.split('@');

    expect(config.installCommand).toBe(`npx --yes npm@${npmVersion} ci`);
  });

  it('serves the browser build of Angular as the static output', () => {
    expect(config.outputDirectory).toBe(`dist/${outputPath}/browser`);
  });

  it('sends every request that is not a static file to the function', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/api/index' }]);
  });

  it('does not let Vercel deploy on every push: deploys come from the release workflow, from the tag', () => {
    expect(config.git.deploymentEnabled).toBe(false);
  });

  it('ships the whole server build with the function', () => {
    expect(config.functions['api/index.mjs'].includeFiles).toBe(`dist/${outputPath}/**`);
  });

  it('sends the same security headers as the Express middleware (the CDN does not run it)', () => {
    const everything = config.headers.find((rule) => rule.source === '/(.*)');
    const sent = Object.fromEntries(
      (everything?.headers ?? []).map(({ key, value }) => [key, value]),
    );

    expect(sent).toEqual(SECURITY_HEADERS);
  });

  it('caches the hashed files for a year, and nothing else', () => {
    const cached = config.headers.filter((rule) =>
      rule.headers.some((header) => header.key === 'Cache-Control'),
    );

    expect(cached.map((rule) => rule.source)).toEqual([
      '/(chunk|main|styles|polyfills)-(.*)\\.(js|css)',
      '/media/(.*)',
    ]);
    for (const rule of cached) {
      expect(rule.headers).toEqual([
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ]);
    }
  });
});

describe('the Vercel function entry (api/index.mjs)', () => {
  it('exists, and is the file vercel.json configures', () => {
    expect(existsSync(join(root, 'api', 'index.mjs'))).toBe(true);
    expect(Object.keys(config.functions)).toEqual(['api/index.mjs']);
  });

  it('serves the request handler that the Angular server build exports', () => {
    const entry = read('api/index.mjs');

    expect(entry).toContain(
      `import { reqHandler } from '../dist/${outputPath}/server/server.mjs';`,
    );
    expect(entry).toContain('export default reqHandler;');
  });

  it('is built by the server, which exports that handler', () => {
    expect(read('src/server.ts')).toContain(
      'export const reqHandler = createNodeRequestHandler(app);',
    );
  });
});

describe('the build output that the Vercel config points at', () => {
  it('is the default one: angular.json does not move it', () => {
    expect(angularJson.projects[project].architect.build.options.outputPath).toBeUndefined();
  });
});

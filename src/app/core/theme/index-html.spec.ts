import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DARK_MODE_CLASS, DARK_SCHEME_QUERY, THEME_STORAGE_KEY } from './theme.constants';

/**
 * `index.html` runs a plain script before the first paint, so it cannot import our constants.
 * These tests keep it from drifting away from them.
 */
const html = readFileSync(join(process.cwd(), 'src', 'index.html'), 'utf8');
const script = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';

describe('src/index.html pre-paint theme script', () => {
  it('exists and is inline (no extra request before the first paint)', () => {
    expect(script.trim()).not.toBe('');
  });

  it('reads the same storage key as the Theme service', () => {
    expect(script).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
  });

  it('sets the same class that switches PrimeNG to dark', () => {
    expect(script).toContain(`classList.add('${DARK_MODE_CLASS}')`);
  });

  it('uses the same system-preference query', () => {
    expect(script).toContain(`matchMedia('${DARK_SCHEME_QUERY}')`);
  });

  it('never throws if storage is blocked', () => {
    expect(script).toMatch(/try\s*{[\s\S]*}\s*catch/);
  });

  it('declares both color schemes so native controls follow the theme', () => {
    expect(html).toContain('<meta name="color-scheme" content="light dark" />');
  });

  it('behaves: applies the dark class for a saved dark choice and for a dark system, and leaves light alone', () => {
    const run = (saved: string | null, systemDark: boolean) => {
      const classes = new Set<string>();
      const fakeWindow = { matchMedia: () => ({ matches: systemDark }) };
      const fakeDocument = {
        documentElement: { classList: { add: (name: string) => classes.add(name) } },
      };
      const storage = { getItem: () => saved };
      new Function('localStorage', 'window', 'document', script)(storage, fakeWindow, fakeDocument);
      return classes.has(DARK_MODE_CLASS);
    };

    expect(run('dark', false)).toBe(true);
    expect(run('light', true)).toBe(false);
    expect(run(null, true)).toBe(true);
    expect(run(null, false)).toBe(false);
  });
});

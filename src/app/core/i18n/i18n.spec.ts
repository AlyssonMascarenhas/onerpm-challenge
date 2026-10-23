import { ApplicationInitStatus, PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Translation, TranslocoService } from '@jsverse/transloco';
import { ReplaySubject, throwError } from 'rxjs';
import { I18n } from './i18n';
import { LANGUAGE_STORAGE_KEY } from './i18n.constants';
import { Language } from './i18n.enums';
import { provideI18n, provideTranslation } from './provide-i18n';

interface SetupOptions {
  readonly platform?: 'browser' | 'server';
  readonly acceptLanguage?: string;
  readonly browserLanguages?: readonly string[];
}

/** Real Transloco and real translation files; only the browser/request inputs are controlled. */
function setup({ platform = 'browser', acceptLanguage, browserLanguages = [] }: SetupOptions = {}) {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(browserLanguages);
  TestBed.configureTestingModule({
    providers: [
      provideTranslation(),
      { provide: PLATFORM_ID, useValue: platform },
      {
        provide: REQUEST,
        useValue: acceptLanguage
          ? new Request('http://localhost/', { headers: { 'accept-language': acceptLanguage } })
          : null,
      },
    ],
  });
  return { i18n: TestBed.inject(I18n), transloco: TestBed.inject(TranslocoService) };
}

/**
 * Makes the loading of some languages wait until the test releases (or fails) it, to reproduce
 * lazy chunks that finish in a different order than they were requested.
 */
function deferLoads(transloco: TranslocoService, languages: readonly Language[]) {
  const realLoad = transloco.load.bind(transloco);
  const pending = new Map<string, ReplaySubject<Translation>>();
  const subjectOf = (language: string) => {
    const subject = pending.get(language) ?? new ReplaySubject<Translation>(1);
    pending.set(language, subject);
    return subject;
  };

  vi.spyOn(transloco, 'load').mockImplementation((path, options) =>
    languages.includes(path as Language) ? subjectOf(path) : realLoad(path, options),
  );

  return {
    release: (language: Language) =>
      realLoad(language).subscribe((translation) => {
        subjectOf(language).next(translation);
        subjectOf(language).complete();
      }),
    fail: (language: Language, error: Error) => subjectOf(language).error(error),
  };
}

describe('I18n', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = '';
  });
  afterEach(() => vi.restoreAllMocks());

  describe('init in the browser', () => {
    it('starts in English when the visitor has no preference', async () => {
      const { i18n, transloco } = setup();

      await i18n.init();

      expect(i18n.language()).toBe(Language.EN);
      expect(transloco.translate('status.retry')).toBe('Try again');
    });

    it("follows the browser's preferred languages, in order", async () => {
      const { i18n, transloco } = setup({ browserLanguages: ['de-DE', 'tr-TR', 'en'] });

      await i18n.init();

      expect(i18n.language()).toBe(Language.TR);
      expect(transloco.translate('status.retry')).toBe('Tekrar dene');
    });

    it('prefers the saved choice over the browser', async () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ru');
      const { i18n, transloco } = setup({ browserLanguages: ['fr'] });

      await i18n.init();

      expect(i18n.language()).toBe(Language.RU);
      expect(transloco.translate('status.retry')).toBe('Повторить');
    });

    it('ignores an invalid saved value and uses the browser', async () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'klingon');
      const { i18n } = setup({ browserLanguages: ['es-AR'] });

      await i18n.init();

      expect(i18n.language()).toBe(Language.ES);
    });

    it('does not save a language the visitor did not choose', async () => {
      const { i18n } = setup({ browserLanguages: ['fr'] });

      await i18n.init();

      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    });

    it.each([
      [Language.EN, 'ISRC lookup'],
      [Language.PT, 'Consulta de ISRC'],
      [Language.ES, 'Consulta de ISRC'],
      [Language.RU, 'Поиск по ISRC'],
      [Language.FR, 'Recherche par ISRC'],
      [Language.TR, 'ISRC sorgusu'],
    ])('puts the product name, translated, in the tab title (%s)', async (language, title) => {
      const { i18n } = setup();

      await i18n.setLanguage(language);

      expect(document.title).toBe(title);
    });

    it('sets <html lang> to the locale, with the region where it matters', async () => {
      const { i18n } = setup({ browserLanguages: ['pt-PT'] });

      await i18n.init();

      expect(document.documentElement.lang).toBe('pt-BR');
      expect(i18n.locale()).toBe('pt-BR');
    });
  });

  describe('init on the server', () => {
    it('follows the request Accept-Language', async () => {
      const { i18n, transloco } = setup({
        platform: 'server',
        acceptLanguage: 'fr-CH, fr;q=0.9, en;q=0.8',
      });

      await i18n.init();

      expect(i18n.language()).toBe(Language.FR);
      expect(transloco.translate('status.retry')).toBe('Réessayer');
    });

    it('honors the weights of Accept-Language', async () => {
      const { i18n } = setup({ platform: 'server', acceptLanguage: 'de, en;q=0.4, ru;q=0.8' });

      await i18n.init();

      expect(i18n.language()).toBe(Language.RU);
    });

    it('ignores the browser-only sources: storage and navigator.languages', async () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'tr');
      const { i18n } = setup({
        platform: 'server',
        acceptLanguage: 'es',
        browserLanguages: ['ru'],
      });

      await i18n.init();

      expect(i18n.language()).toBe(Language.ES);
    });

    it('uses English when there is no request (prerender) or no header', async () => {
      const { i18n } = setup({ platform: 'server' });

      await i18n.init();

      expect(i18n.language()).toBe(Language.EN);
    });
  });

  describe('every language translates the page', () => {
    it.each([
      [Language.EN, 'Available in Brazil'],
      [Language.PT, 'Disponível no Brasil'],
      [Language.ES, 'Disponible en Brasil'],
      [Language.RU, 'Доступен в Бразилии'],
      [Language.FR, 'Disponible au Brésil'],
      [Language.TR, "Brezilya'da mevcut"],
    ])('%s', async (language, expected) => {
      const { i18n, transloco } = setup();

      await i18n.setLanguage(language);

      expect(transloco.translate('tracks.availableInBR')).toBe(expected);
    });

    it('interpolates parameters in each language', async () => {
      const { i18n, transloco } = setup();

      await i18n.setLanguage(Language.RU);

      expect(transloco.translate('tracks.coverAlt', { album: 'Gó Gó Boys' })).toBe(
        'Обложка альбома «Gó Gó Boys»',
      );
    });
  });

  describe('setLanguage', () => {
    it('switches the language everywhere at once', async () => {
      const { i18n, transloco } = setup();
      await i18n.init();

      await i18n.setLanguage(Language.PT);

      expect(i18n.language()).toBe(Language.PT);
      expect(i18n.locale()).toBe('pt-BR');
      expect(document.documentElement.lang).toBe('pt-BR');
      expect(transloco.getActiveLang()).toBe('pt');
      expect(transloco.translate('status.retry')).toBe('Tentar novamente');
    });

    it('remembers the choice for the next visit', async () => {
      const { i18n } = setup();

      await i18n.setLanguage(Language.TR);

      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('tr');
    });

    it('wins over the browser language on the next visit', async () => {
      const first = setup({ browserLanguages: ['en'] });
      await first.i18n.setLanguage(Language.FR);
      TestBed.resetTestingModule();

      const second = setup({ browserLanguages: ['en'] });
      await second.i18n.init();

      expect(second.i18n.language()).toBe(Language.FR);
    });

    it('can switch back and forth', async () => {
      const { i18n, transloco } = setup();

      await i18n.setLanguage(Language.RU);
      await i18n.setLanguage(Language.EN);

      expect(transloco.translate('status.retry')).toBe('Try again');
      expect(document.documentElement.lang).toBe('en');
    });

    it('keeps the current language, and saves nothing, when the new one cannot be loaded', async () => {
      const { i18n, transloco } = setup();
      await i18n.setLanguage(Language.ES);
      vi.spyOn(transloco, 'load').mockReturnValue(throwError(() => new Error('chunk failed')));

      await expect(i18n.setLanguage(Language.RU)).rejects.toThrow('chunk failed');

      expect(i18n.language()).toBe(Language.ES);
      expect(document.documentElement.lang).toBe('es');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('es');
    });
  });

  describe('overlapping language switches: only the latest selection takes effect', () => {
    it('keeps the newer language when an older one finishes loading last', async () => {
      const { i18n, transloco } = setup();
      await i18n.init();
      const loads = deferLoads(transloco, [Language.RU]);

      const older = i18n.setLanguage(Language.RU); // still waiting for its chunk
      await i18n.setLanguage(Language.FR); // newer, completes first
      loads.release(Language.RU); // the older one finally arrives
      await older;

      expect(i18n.language()).toBe(Language.FR);
      expect(transloco.getActiveLang()).toBe('fr');
      expect(document.documentElement.lang).toBe('fr');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
      expect(transloco.translate('status.retry')).toBe('Réessayer');
    });

    it('still applies and saves a language that finishes in order', async () => {
      const { i18n, transloco } = setup();
      const loads = deferLoads(transloco, [Language.RU]);

      const pending = i18n.setLanguage(Language.RU);
      loads.release(Language.RU);
      await pending;

      expect(i18n.language()).toBe(Language.RU);
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru');
    });

    it('does not report an error for an older request that failed after being superseded', async () => {
      const { i18n, transloco } = setup();
      await i18n.init();
      const loads = deferLoads(transloco, [Language.RU]);

      const older = i18n.setLanguage(Language.RU);
      await i18n.setLanguage(Language.FR);
      loads.fail(Language.RU, new Error('chunk failed'));

      await expect(older).resolves.toBeUndefined();
      expect(i18n.language()).toBe(Language.FR);
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('fr');
    });

    it('keeps the current language when the newest selection fails, instead of resurrecting an older one', async () => {
      const { i18n, transloco } = setup();
      await i18n.init();
      const loads = deferLoads(transloco, [Language.RU, Language.FR]);

      const older = i18n.setLanguage(Language.RU);
      const newest = i18n.setLanguage(Language.FR);
      loads.fail(Language.FR, new Error('chunk failed'));
      await expect(newest).rejects.toThrow('chunk failed');
      loads.release(Language.RU);
      await older;

      expect(i18n.language()).toBe(Language.EN);
      expect(document.documentElement.lang).toBe('en');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull();
    });

    it('lets a language chosen during startup win over the detected one', async () => {
      const { i18n, transloco } = setup({ browserLanguages: ['ru'] });
      const loads = deferLoads(transloco, [Language.RU]);

      const startup = i18n.init(); // detected Russian, still loading
      await i18n.setLanguage(Language.TR); // the visitor already picked Turkish
      loads.release(Language.RU);
      await startup;

      expect(i18n.language()).toBe(Language.TR);
      expect(transloco.getActiveLang()).toBe('tr');
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('tr');
    });

    it('does not fall back to English when startup was superseded', async () => {
      const { i18n, transloco } = setup({ browserLanguages: ['ru'] });
      const loads = deferLoads(transloco, [Language.RU]);

      const startup = i18n.init();
      await i18n.setLanguage(Language.ES);
      loads.fail(Language.RU, new Error('chunk failed'));
      await startup;

      expect(i18n.language()).toBe(Language.ES);
    });
  });

  describe('init resilience', () => {
    it('falls back to English when the detected language cannot be loaded', async () => {
      const { i18n, transloco } = setup({ browserLanguages: ['ru'] });
      const load = transloco.load.bind(transloco);
      vi.spyOn(transloco, 'load').mockImplementation((path, options) =>
        path === Language.RU ? throwError(() => new Error('chunk failed')) : load(path, options),
      );

      await i18n.init();

      expect(i18n.language()).toBe(Language.EN);
      expect(transloco.translate('status.retry')).toBe('Try again');
    });

    it('does not reject even if no language can be loaded: the page must still render', async () => {
      const { i18n, transloco } = setup({ browserLanguages: ['ru'] });
      vi.spyOn(transloco, 'load').mockReturnValue(throwError(() => new Error('offline')));

      await expect(i18n.init()).resolves.toBeUndefined();

      expect(i18n.language()).toBe(Language.EN);
    });
  });

  describe('provideI18n', () => {
    it('loads the language during application startup, before the first render', async () => {
      vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['es']);
      TestBed.configureTestingModule({ providers: [provideI18n()] });

      await TestBed.inject(ApplicationInitStatus).donePromise;

      expect(TestBed.inject(I18n).language()).toBe(Language.ES);
      expect(TestBed.inject(TranslocoService).translate('status.retry')).toBe('Intentar de nuevo');
    });
  });
});

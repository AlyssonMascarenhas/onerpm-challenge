import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { TrackLookupResult } from '../../../../contract/tracks.types';
import { Language } from '../../../core/i18n/i18n.enums';
import { i18nTestProviders, useLanguage } from '../../../testing/i18n-testing';
import { errorResult, foundResult, notFoundResult } from '../testing/builders';
import { TracksApi } from '../tracks-api';
import { TracksUnavailableError } from '../tracks-unavailable-error';
import { TracksPage } from './tracks-page';

/** One Subject per request, so each test decides when and how the BFF answers. */
async function render(options: { language?: Language } = {}) {
  const requests: Subject<readonly TrackLookupResult[]>[] = [];
  const lookup = vi.fn(() => {
    const response = new Subject<readonly TrackLookupResult[]>();
    requests.push(response);
    return response;
  });
  TestBed.configureTestingModule({
    imports: [TracksPage],
    providers: [...i18nTestProviders, { provide: TracksApi, useValue: { lookup } }],
  });
  await useLanguage(options.language);
  const fixture = TestBed.createComponent(TracksPage);
  await fixture.whenStable();
  return { fixture, lookup, requests };
}

const root = (fixture: ComponentFixture<TracksPage>) => fixture.nativeElement as HTMLElement;
const settle = async (fixture: ComponentFixture<TracksPage>) => {
  await fixture.whenStable();
  fixture.detectChanges();
};
const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();
/** What each list entry shows as its headline: a track's title, or an ISRC with the reason it has no track. */
const items = (fixture: ComponentFixture<TracksPage>) =>
  [...root(fixture).querySelectorAll('li')].map((item) =>
    item.querySelector('orp-track-card')
      ? text(item.querySelector('h2'))
      : `${text(item.querySelector('.card__isrc'))} ${text(item.querySelector('.card__message'))}`,
  );

describe('TracksPage', () => {
  beforeEach(() => localStorage.clear());

  describe('hero', () => {
    it('has one heading, the page title, naming the main region', async () => {
      const { fixture } = await render();

      const headings = root(fixture).querySelectorAll('h1');

      expect(headings).toHaveLength(1);
      expect(headings[0].textContent).toBe('Missing ISRCs');
      expect(root(fixture).querySelector('section.hero')?.getAttribute('aria-labelledby')).toBe(
        headings[0].id,
      );
    });

    it.each([
      [Language.EN, 'Missing ISRCs'],
      [Language.PT, 'ISRCs ausentes'],
      [Language.ES, 'ISRC ausentes'],
      [Language.RU, 'Отсутствующие ISRC'],
      [Language.FR, 'ISRC manquants'],
      [Language.TR, "Eksik ISRC'ler"],
    ])('is translated (%s)', async (language, title) => {
      const { fixture } = await render({ language });

      expect(root(fixture).querySelector('h1')?.textContent).toBe(title);
      expect(root(fixture).querySelector('.hero__subtitle')?.textContent?.trim()).not.toBe('');
    });
  });

  describe('loading', () => {
    it('asks for the tracks once, after the first render in the browser', async () => {
      const { lookup } = await render();

      expect(lookup).toHaveBeenCalledTimes(1);
    });

    it('shows placeholders and a status message, and marks the region busy, until the answer comes', async () => {
      const { fixture } = await render();

      expect(root(fixture).querySelectorAll('p-skeleton')).toHaveLength(3);
      expect(root(fixture).querySelector('[role="status"]')?.textContent).toBe('Loading tracks…');
      expect(root(fixture).querySelector('section.content')?.getAttribute('aria-busy')).toBe(
        'true',
      );
      expect(root(fixture).querySelector('ol')).toBeNull();
    });

    it('hides the placeholders from assistive technology (the status message speaks for them)', async () => {
      const { fixture } = await render();

      expect(root(fixture).querySelector('.grid')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('translates the loading message', async () => {
      const { fixture } = await render({ language: Language.PT });

      expect(root(fixture).querySelector('[role="status"]')?.textContent).toBe(
        'Carregando faixas…',
      );
    });
  });

  describe('when the tracks arrive', () => {
    it('lists them by title, A to Z, one card each', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Repente'), foundResult('Louca'), foundResult('Quase Nua')]);
      await settle(fixture);

      expect(items(fixture)).toEqual(['Louca', 'Quase Nua', 'Repente']);
      expect(root(fixture).querySelectorAll('orp-track-card')).toHaveLength(3);
    });

    it('gives each track card its own track', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Louca', { artists: ['DJ Malibu'], durationMs: 124_315 })]);
      await settle(fixture);

      const card = root(fixture).querySelector('orp-track-card');
      expect(text(card?.querySelector('.card__artists'))).toBe('DJ Malibu');
      expect(text(card)).toContain('02:04');
    });

    it('shows ISRCs without a track as their own cards, among the tracks, never as track cards', async () => {
      const { fixture, requests } = await render();

      requests[0].next([
        notFoundResult('BR1SP1200070'),
        foundResult('Louca'),
        errorResult('BR1SP1200071'),
      ]);
      await settle(fixture);

      expect(root(fixture).querySelectorAll('orp-track-card')).toHaveLength(1);
      expect(root(fixture).querySelectorAll('orp-isrc-card')).toHaveLength(2);
    });

    it('is a list of cards, readable as such by assistive technology', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Louca'), foundResult('Repente')]);
      await settle(fixture);

      const list = root(fixture).querySelector('ul.grid');
      expect(list?.querySelectorAll(':scope > li')).toHaveLength(2);
      expect(list?.closest('section')?.getAttribute('aria-label')).toBe('Tracks');
    });

    it('replaces the placeholders and stops being busy', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Louca')]);
      await settle(fixture);

      expect(root(fixture).querySelectorAll('p-skeleton')).toHaveLength(0);
      expect(root(fixture).querySelector('section.content')?.getAttribute('aria-busy')).toBe(
        'false',
      );
    });

    it('keeps an ISRC Spotify does not know in the list, saying so', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Louca'), notFoundResult('BR1SP1200070')]);
      await settle(fixture);

      expect(items(fixture)).toEqual(['Louca', 'BR1SP1200070 ISRC not found on Spotify']);
    });

    it('does not warn when everything loaded', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Louca')]);
      await settle(fixture);

      expect(root(fixture).querySelector('p-message')).toBeNull();
    });

    it('lists ISRCs that failed, and warns once with how many', async () => {
      const { fixture, requests } = await render();

      requests[0].next([
        foundResult('Louca'),
        errorResult('BR1SP1200070'),
        errorResult('BR1SP1200071'),
      ]);
      await settle(fixture);

      const warning = root(fixture).querySelectorAll('p-message');
      expect(warning).toHaveLength(1);
      expect(warning[0].textContent?.trim()).toBe(
        'Some ISRCs could not be loaded. ISRCs affected: 2',
      );
      expect(items(fixture).slice(1)).toEqual([
        'BR1SP1200070 Could not load this ISRC',
        'BR1SP1200071 Could not load this ISRC',
      ]);
    });

    it('is not an alert when only some ISRCs failed', async () => {
      const { fixture, requests } = await render();

      requests[0].next([foundResult('Louca'), errorResult('BR1SP1200070')]);
      await settle(fixture);

      expect(root(fixture).querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('when the music data provider is unavailable', () => {
    async function unavailable(language?: Language) {
      const page = await render({ language });
      page.requests[0].error(new TracksUnavailableError());
      await settle(page.fixture);
      return page;
    }

    it('alerts the visitor, in their language, and shows no tracks', async () => {
      const { fixture } = await unavailable();

      const alert = root(fixture).querySelector('[role="alert"]');
      expect(alert?.textContent).toContain('Music data unavailable');
      expect(root(fixture).querySelector('section.content')?.getAttribute('aria-busy')).toBe(
        'false',
      );
      expect(alert?.textContent).toContain(
        'We could not reach Spotify right now. Please try again in a moment.',
      );
      expect(root(fixture).querySelector('ol')).toBeNull();
      expect(root(fixture).querySelectorAll('p-skeleton')).toHaveLength(0);
    });

    it.each([
      [Language.PT, 'Dados musicais indisponíveis', 'Tentar novamente'],
      [Language.RU, 'Музыкальные данные недоступны', 'Повторить'],
      [Language.TR, 'Müzik verileri kullanılamıyor', 'Tekrar dene'],
    ])('translates the alert and the retry button (%s)', async (language, title, retry) => {
      const { fixture } = await unavailable(language);

      const alert = root(fixture).querySelector('[role="alert"]');
      expect(alert?.textContent).toContain(title);
      expect(alert?.querySelector('button')?.textContent?.trim()).toBe(retry);
    });

    it('offers a retry that asks again, showing the placeholders meanwhile', async () => {
      const { fixture, lookup } = await unavailable();

      (root(fixture).querySelector('[role="alert"] button') as HTMLButtonElement).click();
      await settle(fixture);

      expect(root(fixture).querySelector('section.content')?.getAttribute('aria-busy')).toBe(
        'true',
      );
      expect(lookup).toHaveBeenCalledTimes(2);
      expect(root(fixture).querySelector('[role="alert"]')).toBeNull();
      expect(root(fixture).querySelectorAll('p-skeleton')).toHaveLength(3);
    });

    it('recovers into the list when the retry succeeds', async () => {
      const { fixture, requests } = await unavailable();

      (root(fixture).querySelector('[role="alert"] button') as HTMLButtonElement).click();
      requests[1].next([foundResult('Louca')]);
      await settle(fixture);

      expect(root(fixture).querySelector('[role="alert"]')).toBeNull();
      expect(items(fixture)).toHaveLength(1);
    });

    it('shows the alert again if the retry fails too', async () => {
      const { fixture, requests } = await unavailable();

      (root(fixture).querySelector('[role="alert"] button') as HTMLButtonElement).click();
      requests[1].error(new TracksUnavailableError());
      await settle(fixture);

      expect(root(fixture).querySelector('[role="alert"]')).not.toBeNull();
    });
  });

  it('follows a language change while the list is on screen', async () => {
    const { fixture, requests } = await render();
    requests[0].next([notFoundResult('BR1SP1200070')]);
    await settle(fixture);

    await useLanguage(Language.PT);
    await settle(fixture);

    expect(items(fixture)).toEqual(['BR1SP1200070 ISRC não encontrado no Spotify']);
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ReleaseDatePrecision } from '../../../../contract/tracks.enums';
import { Track } from '../../../../contract/tracks.interfaces';
import { Language } from '../../../core/i18n/i18n.enums';
import { i18nTestProviders, useLanguage } from '../../../testing/i18n-testing';
import { TrackPlayer } from '../track-player/track-player';
import { track } from '../testing/builders';
import { TrackCard } from './track-card';

const SAMPLE: Partial<Track> = {
  id: '7q7QtMiK9jhob0Md7p715D',
  isrc: 'BR1SP1200071',
  title: '...É pra Você',
  artists: ['Gó Gó Boys', 'Convidado'],
  albumName: 'Gó Gó Boys',
  coverUrl: 'https://i.scdn.co/image/abc',
  releaseDate: { value: '2014-05-12', precision: ReleaseDatePrecision.DAY },
  durationMs: 177_626,
  spotifyUrl: 'https://open.spotify.com/track/7q7QtMiK9jhob0Md7p715D',
  availableInBR: true,
};

async function render(
  overrides: Partial<Track> = {},
  language = Language.EN,
): Promise<ComponentFixture<TrackCard>> {
  TestBed.configureTestingModule({ imports: [TrackCard], providers: i18nTestProviders });
  await useLanguage(language);
  const fixture = TestBed.createComponent(TrackCard);
  fixture.componentRef.setInput('track', track({ ...SAMPLE, ...overrides }));
  await fixture.whenStable();
  return fixture;
}

const root = (fixture: ComponentFixture<TrackCard>) => fixture.nativeElement as HTMLElement;
const text = (element: Element | null | undefined) =>
  element?.textContent?.replace(/\s+/g, ' ').trim();
/** The card's facts as `label → value`, read the way the screen shows them. */
const facts = (fixture: ComponentFixture<TrackCard>) =>
  Object.fromEntries(
    [...root(fixture).querySelectorAll('dl > div')].map((row) => [
      text(row.querySelector('dt')),
      text(row.querySelector('dd')),
    ]),
  );

describe('TrackCard', () => {
  beforeEach(() => localStorage.clear());

  describe('content', () => {
    it('shows the title as a heading and the artists below it', async () => {
      const fixture = await render();

      expect(text(root(fixture).querySelector('h2'))).toBe('...É pra Você');
      expect(text(root(fixture).querySelector('.card__artists'))).toBe('Gó Gó Boys, Convidado');
    });

    it('is an article named by its title', async () => {
      const fixture = await render();

      const article = root(fixture).querySelector('article') as HTMLElement;
      const heading = root(fixture).querySelector('h2') as HTMLElement;

      expect(article.getAttribute('aria-labelledby')).toBe(heading.id);
    });

    it('shows release date, duration (mm:ss), album and ISRC', async () => {
      const fixture = await render();

      expect(facts(fixture)).toEqual({
        Released: 'May 12, 2014',
        Duration: '02:58',
        Album: 'Gó Gó Boys',
        ISRC: 'BR1SP1200071',
      });
    });

    it('writes the ISRC in a monospace face, so similar characters can be told apart', async () => {
      const fixture = await render();

      expect(root(fixture).querySelector('.card__isrc')?.textContent).toBe('BR1SP1200071');
    });

    it.each([
      ['year', '2014', ReleaseDatePrecision.YEAR, '2014'],
      ['month', '2014-05', ReleaseDatePrecision.MONTH, 'May 2014'],
      ['day', '2014-05-12', ReleaseDatePrecision.DAY, 'May 12, 2014'],
    ])(
      'shows a %s-precision release date as much as Spotify knows',
      async (_label, value, precision, expected) => {
        const fixture = await render({ releaseDate: { value, precision } });

        expect(facts(fixture)['Released']).toBe(expected);
      },
    );

    it('formats the date in the language of the page', async () => {
      const fixture = await render({}, Language.PT);

      expect(facts(fixture)['Lançamento']).toBe('12 de maio de 2014');
    });

    it('wraps a very long title instead of overflowing the card', async () => {
      const title = 'A'.repeat(300);
      const fixture = await render({ title });

      expect(text(root(fixture).querySelector('h2'))).toBe(title);
    });
  });

  describe('availability in Brazil', () => {
    it('says so when the track is available, with a check icon', async () => {
      const fixture = await render({ availableInBR: true });

      const tag = root(fixture).querySelector('p-tag');
      expect(text(tag)).toBe('Available in Brazil');
      expect(tag?.querySelector('.pi-check-circle')).not.toBeNull();
    });

    it('says so when it is not, with a cross icon: never by color alone', async () => {
      const fixture = await render({ availableInBR: false });

      const tag = root(fixture).querySelector('p-tag');
      expect(text(tag)).toBe('Not available in Brazil');
      expect(tag?.querySelector('.pi-times-circle')).not.toBeNull();
    });

    it('uses the success and danger severities respectively', async () => {
      const available = await render({ availableInBR: true });
      expect(available.nativeElement.querySelector('.p-tag-success')).not.toBeNull();
      TestBed.resetTestingModule();

      const unavailable = await render({ availableInBR: false });
      expect(unavailable.nativeElement.querySelector('.p-tag-danger')).not.toBeNull();
    });

    it.each([
      [Language.PT, true, 'Disponível no Brasil'],
      [Language.PT, false, 'Indisponível no Brasil'],
      [Language.RU, true, 'Доступен в Бразилии'],
      [Language.RU, false, 'Недоступен в Бразилии'],
      [Language.TR, false, "Brezilya'da mevcut değil"],
    ])('is translated (%s, available=%s)', async (language, availableInBR, expected) => {
      const fixture = await render({ availableInBR }, language);

      expect(text(root(fixture).querySelector('p-tag'))).toBe(expected);
    });

    it('sits in the body, never over the cover, where it would be unreadable on busy artwork', async () => {
      const fixture = await render();

      expect(root(fixture).querySelector('.card__cover p-tag')).toBeNull();
      expect(root(fixture).querySelector('.card__body p-tag')).not.toBeNull();
    });
  });

  describe('cover', () => {
    const image = (fixture: ComponentFixture<TrackCard>) =>
      root(fixture).querySelector('img') as HTMLImageElement | null;

    it('shows the album cover with a descriptive alt text', async () => {
      const fixture = await render();

      expect(image(fixture)?.src).toBe('https://i.scdn.co/image/abc');
      expect(image(fixture)?.alt).toBe('Cover of the album Gó Gó Boys');
    });

    it('translates the alt text', async () => {
      const fixture = await render({}, Language.FR);

      expect(image(fixture)?.alt).toBe("Pochette de l'album Gó Gó Boys");
    });

    it('reserves its space and loads lazily, so the page does not jump or fetch ten images at once', async () => {
      const fixture = await render();

      expect(image(fixture)?.getAttribute('width')).toBe('300');
      expect(image(fixture)?.getAttribute('height')).toBe('300');
      expect(image(fixture)?.getAttribute('loading')).toBe('lazy');
      expect(image(fixture)?.getAttribute('decoding')).toBe('async');
    });

    it('shows a labelled placeholder when the album has no cover', async () => {
      const fixture = await render({ coverUrl: null });

      expect(image(fixture)).toBeNull();
      const placeholder = root(fixture).querySelector('[role="img"]');
      expect(placeholder?.getAttribute('aria-label')).toBe('No cover available');
    });

    it('falls back to the placeholder when the image fails to load', async () => {
      const fixture = await render();

      image(fixture)?.dispatchEvent(new Event('error'));
      await fixture.whenStable();
      fixture.detectChanges();

      expect(image(fixture)).toBeNull();
      expect(root(fixture).querySelector('[role="img"]')).not.toBeNull();
    });
  });

  describe('Spotify link', () => {
    const link = (fixture: ComponentFixture<TrackCard>) =>
      root(fixture).querySelector('orp-action-button.card__link a') as HTMLAnchorElement;

    it('goes to the track page on Spotify', async () => {
      const fixture = await render();

      expect(link(fixture).href).toBe('https://open.spotify.com/track/7q7QtMiK9jhob0Md7p715D');
      expect(text(link(fixture))).toContain('Open on Spotify');
    });

    it('opens in a new tab safely, and says so to screen readers', async () => {
      const fixture = await render();

      expect(link(fixture).target).toBe('_blank');
      expect(link(fixture).rel).toBe('noopener noreferrer');
      expect(text(link(fixture).querySelector('.visually-hidden'))).toBe('(opens in a new tab)');
    });

    it('shows the Spotify mark next to the text, hidden from assistive technology', async () => {
      const fixture = await render();

      const mark = link(fixture).querySelector('svg.action__mark--spotify');

      expect(mark?.getAttribute('aria-hidden')).toBe('true');
      expect(text(link(fixture).querySelector('.action__label'))).toBe('Open on Spotify');
    });

    it('is translated', async () => {
      const fixture = await render({}, Language.ES);

      expect(text(link(fixture))).toContain('Abrir en Spotify');
      expect(text(link(fixture))).toContain('(se abre en una pestaña nueva)');
    });
  });

  describe('player', () => {
    it('embeds the preview player for this very track', async () => {
      const fixture = await render();

      const player = fixture.debugElement.query(By.directive(TrackPlayer));

      expect(player.componentInstance.trackId()).toBe('7q7QtMiK9jhob0Md7p715D');
      expect(player.componentInstance.title()).toBe('...É pra Você');
    });
  });

  it('follows a language change while on screen', async () => {
    const fixture = await render();

    await useLanguage(Language.PT);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facts(fixture)['Duração']).toBe('02:58');
    expect(text(root(fixture).querySelector('p-tag'))).toBe('Disponível no Brasil');
  });
});

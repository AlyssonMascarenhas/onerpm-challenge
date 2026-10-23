import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Language } from '../../../core/i18n/i18n.enums';
import { DARK_MODE_CLASS } from '../../../core/theme/theme.constants';
import { Theme } from '../../../core/theme/theme';
import { ThemeMode } from '../../../core/theme/theme.enums';
import { i18nTestProviders, useLanguage } from '../../../testing/i18n-testing';
import { TrackPlayer } from './track-player';

const ID = '7q7QtMiK9jhob0Md7p715D';

async function render(
  options: { trackId?: string; title?: string; language?: Language } = {},
): Promise<ComponentFixture<TrackPlayer>> {
  TestBed.configureTestingModule({ imports: [TrackPlayer], providers: i18nTestProviders });
  await useLanguage(options.language);
  const fixture = TestBed.createComponent(TrackPlayer);
  fixture.componentRef.setInput('trackId', options.trackId ?? ID);
  fixture.componentRef.setInput('title', options.title ?? 'Louca');
  await fixture.whenStable();
  return fixture;
}

const root = (fixture: ComponentFixture<TrackPlayer>) => fixture.nativeElement as HTMLElement;
const button = (fixture: ComponentFixture<TrackPlayer>) =>
  root(fixture).querySelector('button') as HTMLButtonElement | null;
const iframe = (fixture: ComponentFixture<TrackPlayer>) =>
  root(fixture).querySelector('iframe') as HTMLIFrameElement | null;
const listen = async (fixture: ComponentFixture<TrackPlayer>) => {
  button(fixture)?.click();
  await fixture.whenStable();
  fixture.detectChanges();
};

describe('TrackPlayer', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_MODE_CLASS);
  });

  describe('before the visitor asks to listen', () => {
    it('does not ask the browser to focus the button on load', async () => {
      const fixture = await render();

      expect(root(fixture).querySelector('[autofocus]')).toBeNull();
    });

    it('shows only a button, and loads nothing from Spotify', async () => {
      const fixture = await render();

      expect(button(fixture)).not.toBeNull();
      expect(iframe(fixture)).toBeNull();
    });

    it('labels the button, in the visitor language', async () => {
      const english = await render({ language: Language.EN });
      expect(button(english)?.textContent?.trim()).toBe('Listen to a preview');
      TestBed.resetTestingModule();

      const russian = await render({ language: Language.RU });
      expect(button(russian)?.textContent?.trim()).toBe('Послушать фрагмент');
    });

    it('is a group named "Audio preview" for assistive technology', async () => {
      const fixture = await render();

      const group = root(fixture).querySelector('[role="group"]');

      expect(group?.getAttribute('aria-label')).toBe('Audio preview');
    });
  });

  describe('after the visitor asks to listen', () => {
    it("replaces the button with Spotify's embedded player for that track", async () => {
      const fixture = await render();

      await listen(fixture);

      expect(iframe(fixture)?.src).toBe(`https://open.spotify.com/embed/track/${ID}`);
      expect(button(fixture)).toBeNull();
    });

    it('names the player after the track, in the visitor language', async () => {
      const fixture = await render({ title: 'Quase Nua', language: Language.PT });

      await listen(fixture);

      expect(iframe(fixture)?.title).toBe('Player do Spotify para Quase Nua');
    });

    it('is compact (152px), full width, and allowed only to play protected media', async () => {
      const fixture = await render();

      await listen(fixture);

      const frame = iframe(fixture) as HTMLIFrameElement;
      expect(frame.getAttribute('height')).toBe('152');
      expect(frame.getAttribute('allow')).toBe('encrypted-media');
      expect(frame.classList).toContain('player__frame');
    });

    describe('while the embed loads', () => {
      const finishLoading = async (fixture: ComponentFixture<TrackPlayer>, src?: string) => {
        const frame = iframe(fixture) as HTMLIFrameElement;
        if (src !== undefined) {
          Object.defineProperty(frame, 'src', { value: src, configurable: true });
        }
        frame.dispatchEvent(new Event('load'));
        await fixture.whenStable();
        fixture.detectChanges();
      };
      const loading = (fixture: ComponentFixture<TrackPlayer>) =>
        root(fixture).querySelector('.player__loading');

      it('holds the place of the embed at once, with its height, and says it is loading', async () => {
        const fixture = await render();

        await listen(fixture);

        expect((root(fixture).querySelector('.player__stage') as HTMLElement).style.height).toBe(
          '152px',
        );
        expect(loading(fixture)?.getAttribute('role')).toBe('status');
        expect(loading(fixture)?.textContent?.trim()).toBe('Loading the player…');
        expect(iframe(fixture)?.classList).toContain('player__frame--pending');
      });

      it('says it in the visitor language', async () => {
        const fixture = await render({ language: Language.PT });

        await listen(fixture);

        expect(loading(fixture)?.textContent?.trim()).toBe('Carregando o player…');
      });

      it('shows the embed and drops the placeholder once Spotify has loaded it', async () => {
        const fixture = await render();
        await listen(fixture);

        await finishLoading(fixture);

        expect(loading(fixture)).toBeNull();
        expect(iframe(fixture)?.classList).not.toContain('player__frame--pending');
      });

      it('hides the frame that is not ready from the keyboard and assistive technology', () => {
        const styles = readFileSync(
          join(process.cwd(), 'src/app/features/tracks/track-player/track-player.scss'),
          'utf8',
        );
        const pending = /\.player__frame--pending\s*\{([^}]*)\}/.exec(styles)?.[1] ?? '';

        expect(pending).toContain('visibility: hidden');
        expect(pending).not.toContain('opacity');
      });

      it('waits again for the embed that replaces it when the page theme changes', async () => {
        const fixture = await render();
        await listen(fixture);
        await finishLoading(fixture);
        expect(loading(fixture)).toBeNull();

        TestBed.inject(Theme).setMode(ThemeMode.DARK);
        await fixture.whenStable();
        fixture.detectChanges();

        expect(iframe(fixture)?.src).toBe(`https://open.spotify.com/embed/track/${ID}?theme=0`);
        expect(loading(fixture)).not.toBeNull();
        expect(iframe(fixture)?.classList).toContain('player__frame--pending');

        await finishLoading(fixture);

        expect(loading(fixture)).toBeNull();
        expect(iframe(fixture)?.classList).not.toContain('player__frame--pending');
      });

      it('ignores a load of something that is not the Spotify embed', async () => {
        const fixture = await render();
        await listen(fixture);

        await finishLoading(fixture, 'about:blank');

        expect(loading(fixture)).not.toBeNull();
      });
    });

    it('uses the dark player when the page is dark', async () => {
      const fixture = await render();
      TestBed.inject(Theme).setMode(ThemeMode.DARK);

      await listen(fixture);

      expect(iframe(fixture)?.src).toBe(`https://open.spotify.com/embed/track/${ID}?theme=0`);
    });

    it('stays loaded: a second render does not bring the button back', async () => {
      const fixture = await render();
      await listen(fixture);

      fixture.detectChanges();
      await fixture.whenStable();

      expect(iframe(fixture)).not.toBeNull();
      expect(button(fixture)).toBeNull();
    });
  });

  describe('with an id that is not a Spotify id', () => {
    it.each([
      ['empty', ''],
      ['a URL instead of an id', 'https://evil.example/x'],
      ['markup', '"><img src=x onerror=alert(1)>'],
    ])('offers nothing to play (%s)', async (_label, trackId) => {
      const fixture = await render({ trackId });

      expect(button(fixture)).toBeNull();
      expect(iframe(fixture)).toBeNull();
      expect(root(fixture).querySelector('.player')).toBeNull();
    });
  });
});

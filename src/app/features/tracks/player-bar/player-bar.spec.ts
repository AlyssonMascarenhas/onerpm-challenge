import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Language } from '../../../core/i18n/i18n.enums';
import { DARK_MODE_CLASS } from '../../../core/theme/theme.constants';
import { Theme } from '../../../core/theme/theme';
import { ThemeMode } from '../../../core/theme/theme.enums';
import { i18nTestProviders, useLanguage } from '../../../testing/i18n-testing';
import { NowPlaying } from '../now-playing';
import { SpotifyIframeApi } from '../spotify-iframe-api';
import { SpotifyEmbedEvent } from '../spotify-iframe-api.enums';
import {
  SpotifyEmbedController,
  SpotifyEmbedOptions,
  SpotifyIframeApiObject,
} from '../spotify-iframe-api.interfaces';
import { track } from '../testing/builders';
import { PlayerBar } from './player-bar';

const ID = '7q7QtMiK9jhob0Md7p715D';
const OTHER_ID = '1A2b3C4d5E6f7G8h9I0j1K';

/** A stand-in for Spotify's controller: it records what the bar asks of it and can fire its events. */
class FakeController implements SpotifyEmbedController {
  public readonly calls: string[] = [];
  public destroyed = false;
  private readonly _listeners = new Map<string, () => void>();

  public loadUri(uri: string): void {
    this.calls.push(`loadUri ${uri}`);
  }
  public play(): void {
    this.calls.push('play');
  }
  public destroy(): void {
    this.destroyed = true;
  }
  public addListener(event: SpotifyEmbedEvent, listener: () => void): void {
    this._listeners.set(event, listener);
  }
  public emit(event: SpotifyEmbedEvent): void {
    this._listeners.get(event)?.();
  }
}

interface Setup {
  fixture: ComponentFixture<PlayerBar>;
  controllers: FakeController[];
  created: { element: HTMLElement; options: SpotifyEmbedOptions }[];
  load: ReturnType<typeof vi.fn>;
}

async function render(
  options: { language?: Language; scriptFails?: boolean } = {},
): Promise<Setup> {
  const controllers: FakeController[] = [];
  const created: Setup['created'] = [];
  const api: SpotifyIframeApiObject = {
    createController: (element, creation, callback) => {
      created.push({ element, options: creation });
      const controller = new FakeController();
      controllers.push(controller);
      callback(controller);
    },
  };
  const load = vi.fn(() =>
    options.scriptFails ? Promise.reject(new Error('blocked')) : Promise.resolve(api),
  );
  TestBed.configureTestingModule({
    imports: [PlayerBar],
    providers: [...i18nTestProviders, { provide: SpotifyIframeApi, useValue: { load } }],
  });
  await useLanguage(options.language);
  const fixture = TestBed.createComponent(PlayerBar);
  await fixture.whenStable();
  return { fixture, controllers, created, load };
}

const root = (fixture: ComponentFixture<PlayerBar>) => fixture.nativeElement as HTMLElement;
const closeButton = (fixture: ComponentFixture<PlayerBar>) =>
  root(fixture).querySelector('button.bar__close') as HTMLButtonElement | null;
const loading = (fixture: ComponentFixture<PlayerBar>) =>
  root(fixture).querySelector('.bar__loading');
const settle = async (fixture: ComponentFixture<PlayerBar>) => {
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
};
const play = async (fixture: ComponentFixture<PlayerBar>, id = ID, title = 'Louca') => {
  TestBed.inject(NowPlaying).play(track({ id, title }));
  await settle(fixture);
};

describe('PlayerBar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove(DARK_MODE_CLASS);
  });

  describe('before the visitor asks to listen', () => {
    it('is empty, and loads nothing from Spotify, not even its script', async () => {
      const { fixture, load } = await render();

      expect(root(fixture).querySelector('section')).toBeNull();
      expect(load).not.toHaveBeenCalled();
    });
  });

  describe('once a track is chosen', () => {
    it('makes the embedded player for that track, in the slim size and the full width', async () => {
      const { fixture, created } = await render();

      await play(fixture);

      expect(created).toHaveLength(1);
      expect(created[0].options).toEqual({
        uri: `spotify:track:${ID}`,
        width: '100%',
        height: 80,
      });
    });

    it('gives the embed a slot inside its own mount point, which the embed may replace', async () => {
      const { fixture, created } = await render();

      await play(fixture);

      const mount = root(fixture).querySelector('.bar__mount') as HTMLElement;
      expect(created[0].element.parentElement).toBe(mount);
    });

    it('starts the music by itself once the embed says it is ready', async () => {
      const { fixture, controllers } = await render();
      await play(fixture);
      expect(controllers[0].calls).toEqual([]);

      controllers[0].emit(SpotifyEmbedEvent.Ready);

      expect(controllers[0].calls).toEqual(['play']);
    });

    it('is a region named "Audio preview" for assistive technology', async () => {
      const { fixture } = await render();

      await play(fixture);

      expect(root(fixture).querySelector('section')?.getAttribute('aria-label')).toBe(
        'Audio preview',
      );
    });

    it('names the frame after the track, in the visitor language, once the embed exists', async () => {
      const { fixture, controllers, created } = await render({ language: Language.PT });
      await play(fixture, ID, 'Quase Nua');
      const frame = document.createElement('iframe');
      (root(fixture).querySelector('.bar__mount') as HTMLElement).replaceChildren(frame);
      controllers[0].emit(SpotifyEmbedEvent.Ready);
      await settle(fixture);

      expect(created).toHaveLength(1);
      expect(frame.title).toBe('Player do Spotify para Quase Nua');
    });

    it('swaps the track in the same player when another is chosen, which starts it too', async () => {
      const { fixture, controllers, created } = await render();
      await play(fixture, ID);
      controllers[0].emit(SpotifyEmbedEvent.Ready);

      await play(fixture, OTHER_ID);
      controllers[0].emit(SpotifyEmbedEvent.Ready);

      expect(created).toHaveLength(1);
      expect(controllers[0].calls).toEqual(['play', `loadUri spotify:track:${OTHER_ID}`, 'play']);
    });

    it('plays the last track chosen when it was chosen while the embed was being made', async () => {
      const { fixture, controllers } = await render();
      TestBed.inject(NowPlaying).play(track({ id: ID }));
      fixture.detectChanges();
      TestBed.inject(NowPlaying).play(track({ id: OTHER_ID }));

      await settle(fixture);

      expect(controllers).toHaveLength(1);
      expect(controllers[0].calls).toContain(`loadUri spotify:track:${OTHER_ID}`);
    });

    it('offers nothing for an id that is not a Spotify id, and asks Spotify for nothing', async () => {
      const { fixture, created } = await render();

      await play(fixture, 'https://evil.example/x');

      expect(created).toHaveLength(0);
    });
  });

  describe('while the embed loads', () => {
    it('holds its place at once, with its height, and says it is loading', async () => {
      const { fixture } = await render();

      await play(fixture);

      expect((root(fixture).querySelector('.bar__stage') as HTMLElement).style.height).toBe('80px');
      expect(loading(fixture)?.getAttribute('role')).toBe('status');
      expect(loading(fixture)?.textContent?.trim()).toBe('Loading the player…');
      expect(root(fixture).querySelector('.bar__mount')?.classList).toContain(
        'bar__mount--pending',
      );
    });

    it('hides the embed that is not ready from the keyboard and assistive technology', () => {
      const styles = readFileSync(
        join(process.cwd(), 'src/app/features/tracks/player-bar/player-bar.scss'),
        'utf8',
      );
      const pending = /\.bar__mount--pending\s*\{([^}]*)\}/.exec(styles)?.[1] ?? '';

      expect(pending).toContain('visibility: hidden');
      expect(pending).not.toContain('opacity');
    });

    it('says it in the visitor language', async () => {
      const { fixture } = await render({ language: Language.PT });

      await play(fixture);

      expect(loading(fixture)?.textContent?.trim()).toBe('Carregando o player…');
    });

    it('shows the embed and drops the placeholder once Spotify says it is ready', async () => {
      const { fixture, controllers } = await render();
      await play(fixture);

      controllers[0].emit(SpotifyEmbedEvent.Ready);
      await settle(fixture);

      expect(loading(fixture)).toBeNull();
      expect(root(fixture).querySelector('.bar__mount')?.classList).not.toContain(
        'bar__mount--pending',
      );
    });
  });

  describe('when Spotify script cannot be loaded (blocked, offline)', () => {
    it('falls back to the plain embed of the track, which the visitor starts', async () => {
      const { fixture } = await render({ scriptFails: true });

      await play(fixture);

      const frame = root(fixture).querySelector('iframe') as HTMLIFrameElement;
      expect(frame.src).toBe(`https://open.spotify.com/embed/track/${ID}`);
      expect(frame.getAttribute('allow')).toBe('encrypted-media');
      expect(frame.getAttribute('height')).toBe('80');
      expect(loading(fixture)).toBeNull();
    });

    it('names the fallback frame after the track, in the visitor language', async () => {
      const { fixture } = await render({ scriptFails: true, language: Language.PT });

      await play(fixture, ID, 'Quase Nua');

      expect(root(fixture).querySelector('iframe')?.title).toBe('Player do Spotify para Quase Nua');
    });

    it('uses the dark player when the page is dark', async () => {
      const { fixture } = await render({ scriptFails: true });
      TestBed.inject(Theme).setMode(ThemeMode.DARK);

      await play(fixture);

      expect(root(fixture).querySelector('iframe')?.src).toBe(
        `https://open.spotify.com/embed/track/${ID}?theme=0`,
      );
    });

    it('tries Spotify script again after the bar was closed', async () => {
      const { fixture, load } = await render({ scriptFails: true });
      await play(fixture);
      closeButton(fixture)?.click();
      await settle(fixture);

      await play(fixture, OTHER_ID);

      expect(load).toHaveBeenCalledTimes(2);
    });

    it('follows the track chosen next', async () => {
      const { fixture } = await render({ scriptFails: true });
      await play(fixture, ID);

      await play(fixture, OTHER_ID);

      expect(root(fixture).querySelectorAll('iframe')).toHaveLength(1);
      expect(root(fixture).querySelector('iframe')?.src).toBe(
        `https://open.spotify.com/embed/track/${OTHER_ID}`,
      );
    });
  });

  describe('closing', () => {
    it('has a labeled close button, in the visitor language', async () => {
      const english = await render();
      await play(english.fixture);
      expect(closeButton(english.fixture)?.getAttribute('aria-label')).toBe('Close the player');
      TestBed.resetTestingModule();

      const portuguese = await render({ language: Language.PT });
      await play(portuguese.fixture);
      expect(closeButton(portuguese.fixture)?.getAttribute('aria-label')).toBe('Fechar o player');
    });

    it('stops the music, takes the embed down and removes the bar', async () => {
      const { fixture, controllers } = await render();
      await play(fixture);

      closeButton(fixture)?.click();
      await settle(fixture);

      expect(TestBed.inject(NowPlaying).track()).toBeNull();
      expect(controllers[0].destroyed).toBe(true);
      expect(root(fixture).querySelector('section')).toBeNull();
    });

    it('makes a new embed when a track is chosen again afterwards', async () => {
      const { fixture, controllers } = await render();
      await play(fixture, ID);
      closeButton(fixture)?.click();
      await settle(fixture);

      await play(fixture, OTHER_ID);

      expect(controllers).toHaveLength(2);
      expect(controllers[1].destroyed).toBe(false);
    });

    it('drops an embed that arrives after the bar was closed', async () => {
      const { fixture, controllers, load } = await render();
      let release!: () => void;
      load.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () =>
              resolve({
                createController: (
                  _element: HTMLElement,
                  _options: SpotifyEmbedOptions,
                  callback: (controller: SpotifyEmbedController) => void,
                ) => {
                  const controller = new FakeController();
                  controllers.push(controller);
                  callback(controller);
                },
              });
          }),
      );
      await play(fixture);

      closeButton(fixture)?.click();
      await settle(fixture);
      release();
      await settle(fixture);

      expect(controllers).toHaveLength(1);
      expect(controllers[0].destroyed).toBe(true);
    });
  });

  it('takes the embed down with the page', async () => {
    const { fixture, controllers } = await render();
    await play(fixture);

    fixture.destroy();

    expect(controllers[0].destroyed).toBe(true);
  });
});

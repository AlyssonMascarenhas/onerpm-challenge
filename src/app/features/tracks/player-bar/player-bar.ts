import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { translateSignal } from '@jsverse/transloco';
import { Track } from '../../../../contract/tracks.interfaces';
import { Theme } from '../../../core/theme/theme';
import { NowPlaying } from '../now-playing';
import { buildEmbedUrl, buildTrackUri } from '../spotify-embed';
import { SpotifyIframeApi } from '../spotify-iframe-api';
import { SpotifyEmbedEvent } from '../spotify-iframe-api.enums';
import { SpotifyEmbedController } from '../spotify-iframe-api.interfaces';
import { SPOTIFY_EMBED_HEIGHT } from '../tracks.constants';

/**
 * Audio preview through Spotify's official embed (the API gives no `preview_url`, see ADR 0005), in a bar
 * pinned to the bottom of the window: the visitor can pause or skip around while scrolling the other cards,
 * and there is never more than one player. Nothing from Spotify loads until the visitor asks to listen, and
 * then the music starts by itself (through Spotify's iFrame API). If that script cannot be loaded (blocked,
 * offline), the plain embed takes over: the visitor presses play in it.
 */
@Component({
  selector: 'orp-player-bar',
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerBar {
  private readonly _nowPlaying = inject(NowPlaying);
  private readonly _iframeApi = inject(SpotifyIframeApi);
  private readonly _theme = inject(Theme);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _mount = viewChild<ElementRef<HTMLElement>>('mount');
  private readonly _ready = signal(false);
  private readonly _failed = signal(false);
  private _controller: SpotifyEmbedController | null = null;
  private _creating = false;
  private _wantedUri: string | null = null;

  protected readonly height = SPOTIFY_EMBED_HEIGHT;
  protected readonly track = this._nowPlaying.track;
  protected readonly ready = this._ready.asReadonly();
  protected readonly regionLabel = translateSignal('tracks.preview');
  protected readonly loadingLabel = translateSignal('tracks.loadingPlayer');
  protected readonly closeLabel = translateSignal('tracks.closePlayer');
  protected readonly playerTitle = translateSignal('tracks.playerTitle', {
    title: computed(() => this._nowPlaying.track()?.title ?? ''),
  });

  /** Only when Spotify's script could not load: the plain embed of the track (no autoplay). */
  protected readonly fallbackUrl = computed(() => {
    const track = this._nowPlaying.track();
    const url = this._failed() && track ? buildEmbedUrl(track.id, this._theme.isDark()) : null;
    // Trusted because it is our fixed Spotify origin plus an id validated by `buildEmbedUrl`.
    return url ? this._sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  constructor() {
    effect(() => {
      const track = this._nowPlaying.track();
      const mount = this._mount();
      untracked(() => this._sync(track, mount?.nativeElement ?? null));
    });
    effect(() => {
      const title = this.playerTitle();
      this._ready();
      const frame = this._mount()?.nativeElement.querySelector('iframe');
      if (frame) {
        frame.title = title;
      }
    });
    inject(DestroyRef).onDestroy(() => this._release());
  }

  protected close(): void {
    this._nowPlaying.stop();
  }

  /** Brings the embed in line with the track chosen: creates it, swaps its track, or takes it down. */
  private _sync(track: Track | null, mount: HTMLElement | null): void {
    const uri = track ? buildTrackUri(track.id) : null;
    this._wantedUri = uri;
    if (!uri) {
      this._release();
      this._failed.set(false); // a closed bar forgets a failure: the next track tries Spotify's script again
      return;
    }
    if (this._controller) {
      this._controller.loadUri(uri); // the embed says "ready" again, and the music starts
      return;
    }
    if (!mount || this._creating || this._failed()) {
      return;
    }
    this._creating = true;
    this._iframeApi
      .load()
      .then((api) => {
        // The embed replaces the element it is given: give it a slot, so our own mount point stays.
        const slot = mount.ownerDocument.createElement('div');
        mount.appendChild(slot);
        api.createController(slot, { uri, width: '100%', height: this.height }, (controller) =>
          this._adopt(controller, uri, mount),
        );
      })
      .catch(() => {
        this._creating = false;
        this._failed.set(true);
      });
  }

  private _adopt(controller: SpotifyEmbedController, createdFor: string, mount: HTMLElement): void {
    this._creating = false;
    if (this._wantedUri === null) {
      controller.destroy(); // closed while the embed was being made
      return;
    }
    if (!mount.isConnected) {
      // Closed and chosen again meanwhile: the bar has a new mount point, so start over there.
      controller.destroy();
      this._sync(this._nowPlaying.track(), this._mount()?.nativeElement ?? null);
      return;
    }
    this._controller = controller;
    controller.addListener(SpotifyEmbedEvent.Ready, () => {
      this._ready.set(true);
      controller.play();
    });
    if (this._wantedUri !== createdFor) {
      controller.loadUri(this._wantedUri); // another track was chosen meanwhile
    }
  }

  private _release(): void {
    this._controller?.destroy();
    this._controller = null;
    this._ready.set(false);
  }
}

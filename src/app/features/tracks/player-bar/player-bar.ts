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
import {
  SPOTIFY_EMBED_HEIGHT,
  SPOTIFY_EMBED_READY_TIMEOUT_MS,
  SPOTIFY_EMBED_URL,
} from '../tracks.constants';

/**
 * Audio preview through Spotify's official embed (the API gives no `preview_url`, see ADR 0005), in a bar
 * pinned to the bottom of the window: the visitor can pause or skip around while scrolling the other cards,
 * and there is never more than one player. Nothing from Spotify loads until the visitor asks to listen, and
 * then the music starts by itself (through Spotify's iFrame API). If that cannot be done (script blocked, offline,
 * or a step stalls past a deadline), the plain embed takes over: the visitor presses play in it.
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
  /** The address of the fallback frame that has finished loading (it changes with the track and the theme). */
  private readonly _loadedFallback = signal<string | null>(null);
  private _controller: SpotifyEmbedController | null = null;
  private _creating = false;
  private _wantedUri: string | null = null;
  /** Numbers each try to start the player; a try that is no longer the current one is ignored when it answers. */
  private _attempt = 0;
  private _deadline: ReturnType<typeof setTimeout> | null = null;

  protected readonly height = SPOTIFY_EMBED_HEIGHT;
  protected readonly track = this._nowPlaying.track;
  protected readonly ready = this._ready.asReadonly();
  protected readonly regionLabel = translateSignal('tracks.preview');
  protected readonly loadingLabel = translateSignal('tracks.loadingPlayer');
  protected readonly closeLabel = translateSignal('tracks.closePlayer');
  protected readonly playerTitle = translateSignal('tracks.playerTitle', {
    title: computed(() => this._nowPlaying.track()?.title ?? ''),
  });

  /** Only when the player could not be started by code: the address of the plain embed of the track. */
  private readonly _fallbackAddress = computed(() => {
    const track = this._nowPlaying.track();
    return this._failed() && track ? buildEmbedUrl(track.id, this._theme.isDark()) : null;
  });

  protected readonly fallbackUrl = computed(() => {
    const url = this._fallbackAddress();
    // Trusted because it is our fixed Spotify origin plus an id validated by `buildEmbedUrl`.
    return url ? this._sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /** What the visitor has on screen can be played: the embed is ready or, in fallback, its own frame loaded. */
  protected readonly shown = computed(() =>
    this._failed()
      ? this._fallbackAddress() !== null && this._loadedFallback() === this._fallbackAddress()
      : this._ready(),
  );

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

  protected onFallbackLoad(event: Event): void {
    // Some browsers fire an initial `load` for the blank frame, before the embed's address is applied.
    const { src } = event.target as HTMLIFrameElement;
    if (src.startsWith(SPOTIFY_EMBED_URL)) {
      this._loadedFallback.set(src);
    }
  }

  /** Brings the embed in line with the track chosen: creates it, swaps its track, or takes it down. */
  private _sync(track: Track | null, mount: HTMLElement | null): void {
    const uri = track ? buildTrackUri(track.id) : null;
    this._wantedUri = uri;
    if (!uri) {
      this._release();
      // A closed bar forgets a failure: the next track tries Spotify's script again, and a fallback frame loads anew.
      this._failed.set(false);
      this._loadedFallback.set(null);
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
    const attempt = this._startAttempt();
    this._iframeApi
      .load()
      .then((api) => {
        if (attempt !== this._attempt) {
          return; // closed (or given up on) while the script was loading
        }
        // The embed replaces the element it is given: give it a slot, so our own mount point stays.
        const slot = mount.ownerDocument.createElement('div');
        mount.appendChild(slot);
        api.createController(slot, { uri, width: '100%', height: this.height }, (controller) =>
          this._adopt(controller, uri, mount, attempt),
        );
      })
      .catch(() => {
        // Only a try still wanted counts as a failure: one that fails after the bar was closed says nothing
        // about the next track.
        if (attempt === this._attempt) {
          this._giveUp();
        }
      });
  }

  private _adopt(
    controller: SpotifyEmbedController,
    createdFor: string,
    mount: HTMLElement,
    attempt: number,
  ): void {
    if (attempt !== this._attempt) {
      controller.destroy(); // arrived after the bar was closed, or after the deadline
      return;
    }
    this._creating = false;
    if (!mount.isConnected) {
      // Closed and chosen again meanwhile: the bar has a new mount point, so start over there.
      controller.destroy();
      this._sync(this._nowPlaying.track(), this._mount()?.nativeElement ?? null);
      return;
    }
    this._controller = controller;
    controller.addListener(SpotifyEmbedEvent.Ready, () => {
      if (attempt !== this._attempt) {
        return;
      }
      this._clearDeadline();
      this._ready.set(true);
      controller.play();
    });
    const wanted = this._wantedUri;
    if (wanted !== null && wanted !== createdFor) {
      controller.loadUri(wanted); // another track was chosen meanwhile
    }
  }

  /** Starts a try, with its deadline: whichever step stalls, the plain embed takes over when it expires. */
  private _startAttempt(): number {
    this._clearDeadline();
    const attempt = ++this._attempt;
    this._deadline = setTimeout(() => {
      if (attempt === this._attempt) {
        this._giveUp();
      }
    }, SPOTIFY_EMBED_READY_TIMEOUT_MS);
    return attempt;
  }

  private _clearDeadline(): void {
    if (this._deadline !== null) {
      clearTimeout(this._deadline);
      this._deadline = null;
    }
  }

  /** Takes down whatever was started and switches to the plain embed. */
  private _giveUp(): void {
    this._release();
    this._failed.set(true);
  }

  /** Takes the embed down and makes every answer still on its way, from any try, be ignored. */
  private _release(): void {
    this._attempt++;
    this._clearDeadline();
    this._controller?.destroy();
    this._controller = null;
    this._creating = false;
    this._ready.set(false);
  }
}

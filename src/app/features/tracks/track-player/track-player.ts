import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { translateSignal } from '@jsverse/transloco';
import { Theme } from '../../../core/theme/theme';
import { ActionButton } from '../../../shared/action-button/action-button';
import { ActionIcon } from '../../../shared/action-button/action-button.enums';
import { buildEmbedUrl } from '../spotify-embed';
import { SPOTIFY_EMBED_HEIGHT, SPOTIFY_EMBED_URL } from '../tracks.constants';

/**
 * Audio preview through Spotify's official embed (the API gives no `preview_url`, see ADR 0005).
 * The embed is heavy and third-party, so the page first shows a button and only loads the
 * player when the visitor asks to listen: ten tracks do not mean ten players at page load.
 */
@Component({
  selector: 'orp-track-player',
  imports: [ActionButton],
  templateUrl: './track-player.html',
  styleUrl: './track-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackPlayer {
  public readonly trackId = input.required<string>();
  public readonly title = input.required<string>();

  private readonly _theme = inject(Theme);
  private readonly _sanitizer = inject(DomSanitizer);
  private readonly _requested = signal(false);
  /** The address of the embed that has finished loading (it changes with the theme, and then loads again). */
  private readonly _loadedUrl = signal<string | null>(null);

  protected readonly height = SPOTIFY_EMBED_HEIGHT;
  protected readonly playIcon = ActionIcon.Play;
  protected readonly listen = translateSignal('tracks.listen');
  protected readonly regionLabel = translateSignal('tracks.preview');
  protected readonly loadingLabel = translateSignal('tracks.loadingPlayer');
  protected readonly playerTitle = translateSignal('tracks.playerTitle', { title: this.title });

  /** The id was not a Spotify id: there is nothing safe to embed, so no player is offered. */
  protected readonly available = computed(() => buildEmbedUrl(this.trackId(), false) !== null);

  /** Set only once the visitor asked to listen. */
  private readonly _embedAddress = computed(() =>
    this._requested() ? buildEmbedUrl(this.trackId(), this._theme.isDark()) : null,
  );

  protected readonly embedUrl = computed(() => {
    const url = this._embedAddress();
    // Trusted because it is our fixed Spotify origin plus an id validated by `buildEmbedUrl`.
    return url ? this._sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  /**
   * The embed in place has finished loading: until then a placeholder of the same size holds its place.
   * Readiness belongs to one address, so a reload (another theme) waits for its own `load`.
   */
  protected readonly frameLoaded = computed(
    () => this._embedAddress() !== null && this._loadedUrl() === this._embedAddress(),
  );

  protected load(): void {
    this._requested.set(true);
  }

  protected onFrameLoad(event: Event): void {
    // Some browsers fire an initial `load` for the blank frame, before the embed's address is applied.
    const { src } = event.target as HTMLIFrameElement;
    if (src.startsWith(SPOTIFY_EMBED_URL)) {
      this._loadedUrl.set(src);
    }
  }
}

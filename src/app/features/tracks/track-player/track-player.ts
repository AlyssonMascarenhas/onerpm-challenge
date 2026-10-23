import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { translateSignal } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Theme } from '../../../core/theme/theme';
import { buildEmbedUrl } from '../spotify-embed';
import { SPOTIFY_EMBED_HEIGHT } from '../tracks.constants';

/**
 * Audio preview through Spotify's official embed (the API gives no `preview_url`, see ADR 0005).
 * The embed is heavy and third-party, so the page first shows a button and only loads the
 * player when the visitor asks to listen: ten tracks do not mean ten players at page load.
 */
@Component({
  selector: 'orp-track-player',
  imports: [Button],
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

  protected readonly height = SPOTIFY_EMBED_HEIGHT;
  protected readonly listen = translateSignal('tracks.listen');
  protected readonly regionLabel = translateSignal('tracks.preview');
  protected readonly playerTitle = translateSignal('tracks.playerTitle', { title: this.title });

  /** The id was not a Spotify id: there is nothing safe to embed, so no player is offered. */
  protected readonly available = computed(() => buildEmbedUrl(this.trackId(), false) !== null);

  /** Set only once the visitor asked to listen. */
  protected readonly embedUrl = computed(() => {
    const url = this._requested() ? buildEmbedUrl(this.trackId(), this._theme.isDark()) : null;
    // Trusted because it is our fixed Spotify origin plus an id validated by `buildEmbedUrl`.
    return url ? this._sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  });

  protected load(): void {
    this._requested.set(true);
  }
}

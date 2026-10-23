import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { Tag } from 'primeng/tag';
import { Track } from '../../../../contract/tracks.interfaces';
import { I18n } from '../../../core/i18n/i18n';
import { ActionButton } from '../../../shared/action-button/action-button';
import { ActionIcon } from '../../../shared/action-button/action-button.enums';
import { formatDuration } from '../format-duration';
import { formatReleaseDate } from '../format-release-date';
import { TrackPlayer } from '../track-player/track-player';

/** One track: cover, title, artists, release date, duration, Brazil availability, player and link. */
@Component({
  selector: 'orp-track-card',
  imports: [ActionButton, Tag, TrackPlayer],
  templateUrl: './track-card.html',
  styleUrl: './track-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackCard {
  public readonly track = input.required<Track>();

  private readonly _i18n = inject(I18n);
  private readonly _coverFailed = signal(false);

  protected readonly spotifyIcon = ActionIcon.Spotify;
  protected readonly titleId = computed(() => `track-${this.track().id}`);
  protected readonly artists = computed(() => this.track().artists.join(', '));
  protected readonly released = computed(() =>
    formatReleaseDate(this.track().releaseDate, this._i18n.locale()),
  );
  protected readonly duration = computed(() => formatDuration(this.track().durationMs));

  /** The cover to show, or `null` when there is none or it failed to load (a placeholder takes over). */
  protected readonly coverUrl = computed(() =>
    this._coverFailed() ? null : this.track().coverUrl,
  );

  protected readonly labels = {
    coverAlt: translateSignal('tracks.coverAlt', {
      album: computed(() => this.track().albumName),
    }),
    coverMissing: translateSignal('tracks.coverMissing'),
    released: translateSignal('tracks.released'),
    duration: translateSignal('tracks.duration'),
    album: translateSignal('tracks.album'),
    isrc: translateSignal('tracks.isrc'),
    available: translateSignal('tracks.availableInBR'),
    unavailable: translateSignal('tracks.unavailableInBR'),
    openOnSpotify: translateSignal('tracks.openOnSpotify'),
    newTab: translateSignal('app.newTab'),
  };

  protected onCoverError(): void {
    this._coverFailed.set(true);
  }
}

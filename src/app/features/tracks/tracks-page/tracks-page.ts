import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { LookupStatus } from '../../../../contract/tracks.enums';
import { IsrcCard } from '../isrc-card/isrc-card';
import { TrackCard } from '../track-card/track-card';
import { TracksStore } from '../tracks-store';

/** The page: a hero, then the tracks (or why there are none). */
@Component({
  selector: 'orp-tracks-page',
  imports: [Button, Message, Skeleton, TrackCard, IsrcCard],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TracksPage {
  protected readonly store = inject(TracksStore);

  protected readonly title = translateSignal('app.title');
  protected readonly subtitle = translateSignal('app.subtitle');
  protected readonly loading = translateSignal('status.loading');
  protected readonly unavailableTitle = translateSignal('status.unavailableTitle');
  protected readonly unavailableMessage = translateSignal('status.unavailableMessage');
  protected readonly retry = translateSignal('status.retry');
  protected readonly listLabel = translateSignal('tracks.listLabel');
  protected readonly partialFailure = translateSignal('status.partialFailure', {
    count: computed(() => String(this.store.failedCount())),
  });

  /** Busy until the lookup has finished, successfully or not: an alert in a busy region may go unannounced. */
  protected readonly busy = computed(() => !this.store.isReady() && !this.store.isUnavailable());

  protected readonly LookupStatus = LookupStatus;
  protected readonly placeholders = [1, 2, 3];

  constructor() {
    // Browser only: the server render shows the placeholders instead of waiting on Spotify.
    afterNextRender(() => this.store.load());
  }

  protected reload(): void {
    this.store.load();
  }
}

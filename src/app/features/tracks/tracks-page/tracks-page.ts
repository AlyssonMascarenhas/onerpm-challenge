import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { LookupStatus } from '../../../../contract/tracks.enums';
import { IsrcCard } from '../isrc-card/isrc-card';
import { TrackCard } from '../track-card/track-card';
import { TracksStore } from '../tracks-store';

/** The page: a hero, then the tracks (or why there are none). */
@Component({
  selector: 'orp-tracks-page',
  imports: [Button, Dialog, Message, Skeleton, TrackCard, IsrcCard],
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
  protected readonly showAffected = translateSignal('status.showAffected');
  protected readonly affectedTitle = translateSignal('status.affectedTitle');
  protected readonly affectedList = translateSignal('status.affectedList');
  protected readonly affectedHint = translateSignal('status.affectedHint');
  protected readonly close = translateSignal('status.close');
  protected readonly partialFailure = translateSignal('status.partialFailure', {
    count: computed(() => String(this.store.failedCount())),
  });

  /** Busy until the lookup has finished, successfully or not: an alert in a busy region may go unannounced. */
  protected readonly busy = computed(() => !this.store.isReady() && !this.store.isUnavailable());

  /** Whether the list of ISRCs that failed is open. */
  protected readonly affectedOpen = signal(false);

  protected readonly LookupStatus = LookupStatus;
  protected readonly placeholders = [1, 2, 3, 4];

  constructor() {
    // Browser only: the server render shows the placeholders instead of waiting on Spotify.
    afterNextRender(() => this.store.load());
  }

  protected reload(): void {
    this.store.load();
  }

  protected retryAffected(): void {
    this.affectedOpen.set(false);
    this.store.load();
  }
}

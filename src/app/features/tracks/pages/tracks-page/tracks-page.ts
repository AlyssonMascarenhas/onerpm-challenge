import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Skeleton } from 'primeng/skeleton';
import { LookupStatus } from '../../../../../contract/tracks.enums';
import { SortDirection } from '../../domain/domain.enums';
import { filterResults } from '../../domain/filter-results';
import { IsrcCard } from '../../components/isrc-card/isrc-card';
import { IsrcListDialog } from '../../components/isrc-list-dialog/isrc-list-dialog';
import { TrackCard } from '../../components/track-card/track-card';
import { TracksStore } from '../../store/tracks-store';

/** The page: a hero, then the tracks (or why there are none), with a filter and the ISRCs that are missing. */
@Component({
  selector: 'orp-tracks-page',
  imports: [
    Button,
    IconField,
    InputIcon,
    InputText,
    IsrcCard,
    IsrcListDialog,
    Message,
    Skeleton,
    TrackCard,
  ],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TracksPage {
  protected readonly store = inject(TracksStore);

  private readonly _missingTrigger = viewChild<ElementRef<HTMLElement>>('missingTrigger');
  private readonly _filterInput = viewChild<ElementRef<HTMLInputElement>>('filterInput');

  /** What the visitor typed to filter the list by track title or ISRC. */
  protected readonly query = signal('');

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
  protected readonly filterLabel = translateSignal('list.filterLabel');
  protected readonly filterPlaceholder = translateSignal('list.filterPlaceholder');
  protected readonly filterClear = translateSignal('list.filterClear');
  protected readonly missingTitle = translateSignal('list.missingTitle');
  protected readonly missingHint = translateSignal('list.missingHint');
  protected readonly partialFailure = translateSignal('status.partialFailure', {
    count: computed(() => String(this.store.failedCount())),
  });
  protected readonly missingButton = translateSignal('list.missingButton', {
    count: computed(() => String(this.store.notFoundCount())),
  });

  /** The results the filter lets through, in display order. */
  protected readonly visibleItems = computed(() => filterResults(this.store.items(), this.query()));

  private readonly _foundSummary = translateSignal('list.summary', {
    count: computed(() => String(this.store.foundCount())),
  });
  private readonly _filteredSummary = translateSignal('list.filterCount', {
    shown: computed(() => String(this.visibleItems().length)),
    total: computed(() => String(this.store.totalCount())),
  });

  /** "Tracks on Spotify: 8", or, while filtering, how many of the list the filter shows. */
  protected readonly summary = computed(() =>
    this.query().trim() === '' ? this._foundSummary() : this._filteredSummary(),
  );
  protected readonly filterEmpty = translateSignal('list.filterEmpty', { query: this.query });

  private readonly _sortAsc = translateSignal('list.sortAsc');
  private readonly _sortDesc = translateSignal('list.sortDesc');
  private readonly _sortedAsc = translateSignal('list.sortedAsc');
  private readonly _sortedDesc = translateSignal('list.sortedDesc');

  protected readonly sortHint = translateSignal('list.sortHint');

  /** The text of the button that reverses the order: it names the order the list is in now. */
  protected readonly sortLabel = computed(() =>
    this.store.direction() === SortDirection.ASC ? this._sortAsc() : this._sortDesc(),
  );
  protected readonly sortIcon = computed(() =>
    this.store.direction() === SortDirection.ASC
      ? 'pi pi-sort-alpha-down'
      : 'pi pi-sort-alpha-down-alt',
  );
  /** Said to screen readers when the order changes (the button's own text is not a live region). */
  protected readonly sortAnnouncement = computed(() =>
    this.store.direction() === SortDirection.ASC ? this._sortedAsc() : this._sortedDesc(),
  );

  /** Busy until the lookup has finished, successfully or not: an alert in a busy region may go unannounced. */
  protected readonly busy = computed(() => !this.store.isReady() && !this.store.isUnavailable());

  /** Whether the list of ISRCs that failed is open. */
  protected readonly affectedOpen = signal(false);
  /** Whether the list of ISRCs that are not in the database is open. */
  protected readonly missingOpen = signal(false);

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

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** Clears the filter and keeps the focus in the field: the button that was used goes away with the text. */
  protected clearQuery(): void {
    this.query.set('');
    this._filterInput()?.nativeElement.focus();
  }

  /** The list of missing ISRCs closed: the focus goes back to the button that opened it. */
  protected focusMissingTrigger(): void {
    this._missingTrigger()?.nativeElement.focus();
  }
}

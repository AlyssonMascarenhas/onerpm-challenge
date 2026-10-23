import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { LookupStatus } from '../../../contract/tracks.enums';
import { TrackLookupResult } from '../../../contract/tracks.types';
import { sortResults } from './sort-results';
import { CHALLENGE_ISRCS } from './tracks.constants';
import { TracksLoadStatus } from './tracks.enums';
import { TracksApi } from './tracks-api';

/** State of the tracks page: what is loading, what came back and how it should be ordered. */
@Injectable({ providedIn: 'root' })
export class TracksStore {
  private readonly _api = inject(TracksApi);
  private readonly _status = signal(TracksLoadStatus.IDLE);
  private readonly _results = signal<readonly TrackLookupResult[]>([]);
  private _inflight: Subscription | null = null;

  public readonly status = this._status.asReadonly();

  /** Results in display order (see `sortResults`). */
  public readonly items = computed(() => sortResults(this._results()));
  public readonly isReady = computed(() => this._status() === TracksLoadStatus.READY);
  public readonly isLoading = computed(() => this._status() === TracksLoadStatus.LOADING);
  public readonly isUnavailable = computed(() => this._status() === TracksLoadStatus.UNAVAILABLE);

  /** ISRCs that failed while the rest loaded (in display order): worth a warning, not a blocking alert. */
  public readonly failedIsrcs = computed(() =>
    this.items()
      .filter((result) => result.status === LookupStatus.ERROR)
      .map((result) => result.isrc),
  );
  public readonly failedCount = computed(() => this.failedIsrcs().length);

  /** ISRCs Spotify has no track for: they are not in the database, as the page says (in display order). */
  public readonly notFoundIsrcs = computed(() =>
    this.items()
      .filter((result) => result.status === LookupStatus.NOT_FOUND)
      .map((result) => result.isrc),
  );
  public readonly notFoundCount = computed(() => this.notFoundIsrcs().length);

  public readonly foundCount = computed(
    () => this._results().filter((result) => result.status === LookupStatus.FOUND).length,
  );
  public readonly totalCount = computed(() => this._results().length);

  constructor() {
    inject(DestroyRef).onDestroy(() => this._inflight?.unsubscribe());
  }

  /** Loads the ISRCs; calling it again (e.g. "try again") cancels a request still in flight. */
  public load(isrcs: readonly string[] = CHALLENGE_ISRCS): void {
    this._inflight?.unsubscribe();
    this._status.set(TracksLoadStatus.LOADING);

    this._inflight = this._api.lookup(isrcs).subscribe({
      next: (results) => {
        this._results.set(results);
        this._status.set(TracksLoadStatus.READY);
      },
      error: () => {
        this._results.set([]);
        this._status.set(TracksLoadStatus.UNAVAILABLE);
      },
    });
  }
}

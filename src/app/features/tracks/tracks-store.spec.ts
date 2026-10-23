import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { LookupStatus } from '../../../contract/tracks.enums';
import { TrackLookupResult } from '../../../contract/tracks.types';
import { TracksApi } from './tracks-api';
import { TracksStore } from './tracks-store';
import { TracksUnavailableError } from './tracks-unavailable-error';
import { CHALLENGE_ISRCS } from './tracks.constants';
import { TracksLoadStatus } from './tracks.enums';
import { errorResult, foundResult, notFoundResult, titles } from './testing/builders';

/** The API is replaced by one Subject per request, so each test decides when and how it answers. */
function setup() {
  const requests: Subject<readonly TrackLookupResult[]>[] = [];
  const lookup = vi.fn<TracksApi['lookup']>(() => {
    const response = new Subject<readonly TrackLookupResult[]>();
    requests.push(response);
    return response;
  });
  TestBed.configureTestingModule({ providers: [{ provide: TracksApi, useValue: { lookup } }] });
  return { store: TestBed.inject(TracksStore), lookup, requests };
}

describe('TracksStore', () => {
  it('starts idle and empty', () => {
    const { store, lookup } = setup();

    expect(store.status()).toBe(TracksLoadStatus.IDLE);
    expect(store.items()).toEqual([]);
    expect(store.isLoading()).toBe(false);
    expect(store.isReady()).toBe(false);
    expect(store.isUnavailable()).toBe(false);
    expect(lookup).not.toHaveBeenCalled();
  });

  describe('load', () => {
    it('looks up the challenge ISRCs by default', () => {
      const { store, lookup } = setup();

      store.load();

      expect(lookup).toHaveBeenCalledExactlyOnceWith(CHALLENGE_ISRCS);
    });

    it('can look up another list', () => {
      const { store, lookup } = setup();

      store.load(['BR1SP1200071']);

      expect(lookup).toHaveBeenCalledExactlyOnceWith(['BR1SP1200071']);
    });

    it('is loading until the response arrives', () => {
      const { store } = setup();

      store.load();

      expect(store.status()).toBe(TracksLoadStatus.LOADING);
      expect(store.isLoading()).toBe(true);
    });

    it('becomes ready and exposes the items sorted by title', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].next([foundResult('Repente'), foundResult('Louca'), foundResult('Quase Nua')]);

      expect(store.status()).toBe(TracksLoadStatus.READY);
      expect(store.isReady()).toBe(true);
      expect(store.isLoading()).toBe(false);
      expect(titles(store.items())).toEqual(['Louca', 'Quase Nua', 'Repente']);
    });

    it('lists not-found ISRCs after the tracks instead of dropping them', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].next([notFoundResult('BR1SP1200070'), foundResult('Louca')]);

      expect(store.items().map((item) => item.status)).toEqual([
        LookupStatus.FOUND,
        LookupStatus.NOT_FOUND,
      ]);
    });
  });

  describe('failures', () => {
    it('is unavailable, with no items, when the whole lookup fails', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].error(new TracksUnavailableError());

      expect(store.status()).toBe(TracksLoadStatus.UNAVAILABLE);
      expect(store.isUnavailable()).toBe(true);
      expect(store.isLoading()).toBe(false);
      expect(store.items()).toEqual([]);
    });

    it('counts ISRCs that failed while the rest loaded, without being unavailable', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].next([
        foundResult('Louca'),
        errorResult('BR1SP1200070'),
        errorResult('BR1SP1200071'),
      ]);

      expect(store.isUnavailable()).toBe(false);
      expect(store.status()).toBe(TracksLoadStatus.READY);
      expect(store.failedCount()).toBe(2);
      expect(store.items()).toHaveLength(3);
    });

    it('has no failures when everything loaded', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].next([foundResult('Louca')]);

      expect(store.failedCount()).toBe(0);
    });

    it('recovers when the user tries again', () => {
      const { store, requests } = setup();
      store.load();
      requests[0].error(new TracksUnavailableError());

      store.load();
      expect(store.status()).toBe(TracksLoadStatus.LOADING);
      requests[1].next([foundResult('Louca')]);

      expect(store.status()).toBe(TracksLoadStatus.READY);
      expect(titles(store.items())).toEqual(['Louca']);
    });
  });

  describe('overlapping requests', () => {
    it('cancels the request still in flight when load() is called again', () => {
      const { store, requests } = setup();
      store.load();

      store.load();

      expect(requests[0].observed).toBe(false);
      expect(requests[1].observed).toBe(true);
    });

    it('ignores a late answer of a cancelled request', () => {
      const { store, requests } = setup();
      store.load();
      store.load();

      requests[0].next([foundResult('Stale')]);
      requests[1].next([foundResult('Fresh')]);

      expect(titles(store.items())).toEqual(['Fresh']);
    });

    it('keeps the previous items visible while reloading', () => {
      const { store, requests } = setup();
      store.load();
      requests[0].next([foundResult('Louca')]);

      store.load();

      expect(store.isLoading()).toBe(true);
      expect(titles(store.items())).toEqual(['Louca']);
    });
  });

  it('stops listening to a pending request when the store is destroyed', () => {
    const { store, requests } = setup();
    store.load();

    TestBed.resetTestingModule();

    expect(requests[0].observed).toBe(false);
  });
});

import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { LookupStatus } from '../../../../contract/tracks.enums';
import { TrackLookupResult } from '../../../../contract/tracks.types';
import { TracksApi } from '../api/tracks-api';
import { TracksStore } from './tracks-store';
import { TracksUnavailableError } from '../api/tracks-unavailable-error';
import { CHALLENGE_ISRCS } from './store.constants';
import { SortDirection } from '../domain/domain.enums';
import { TracksLoadStatus } from './store.enums';
import { errorResult, foundResult, notFoundResult, titles } from '../testing/builders';

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

  describe('sort direction', () => {
    const loaded = () => {
      const page = setup();
      page.store.load();
      page.requests[0].next([
        foundResult('Quase Nua'),
        notFoundResult('XX1AA0000001'),
        foundResult('Louca'),
        foundResult('Repente'),
      ]);
      return page.store;
    };

    it('starts from A to Z', () => {
      const store = loaded();

      expect(store.direction()).toBe(SortDirection.ASC);
      expect(titles(store.items()).slice(0, 3)).toEqual(['Louca', 'Quase Nua', 'Repente']);
    });

    it('reverses the tracks when toggled, and goes back when toggled again', () => {
      const store = loaded();

      store.toggleDirection();
      expect(store.direction()).toBe(SortDirection.DESC);
      expect(titles(store.items()).slice(0, 3)).toEqual(['Repente', 'Quase Nua', 'Louca']);

      store.toggleDirection();
      expect(store.direction()).toBe(SortDirection.ASC);
      expect(titles(store.items()).slice(0, 3)).toEqual(['Louca', 'Quase Nua', 'Repente']);
    });

    it('keeps the ISRCs that are not in the database after the tracks, in both directions', () => {
      const store = loaded();

      store.toggleDirection();

      expect(store.items()[3].isrc).toBe('XX1AA0000001');
      expect(store.notFoundIsrcs()).toEqual(['XX1AA0000001']);
    });

    it('survives a new load: the visitor chose it', () => {
      const { store, requests } = setup();
      store.load();
      requests[0].next([foundResult('Louca'), foundResult('Quase Nua')]);
      store.toggleDirection();

      store.load();
      requests[1].next([foundResult('Louca'), foundResult('Quase Nua')]);

      expect(titles(store.items())).toEqual(['Quase Nua', 'Louca']);
    });
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

    it('lists the ISRCs that failed, in display order, not the ones that merely have no track', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].next([
        errorResult('BR1SP1200071'),
        foundResult('Louca'),
        notFoundResult('XX1AA0000001'),
        errorResult('BR1SP1200070'),
      ]);

      expect(store.failedIsrcs()).toEqual(['BR1SP1200070', 'BR1SP1200071']);
    });

    it('counts what was found, what is not in the database and the total', () => {
      const { store, requests } = setup();
      store.load();

      requests[0].next([
        foundResult('Louca'),
        foundResult('Quase Nua'),
        notFoundResult('XX1AA0000002'),
        notFoundResult('XX1AA0000001'),
        errorResult('BR1SP1200070'),
      ]);

      expect(store.foundCount()).toBe(2);
      expect(store.notFoundCount()).toBe(2);
      expect(store.totalCount()).toBe(5);
      expect(store.notFoundIsrcs()).toEqual(['XX1AA0000001', 'XX1AA0000002']);
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

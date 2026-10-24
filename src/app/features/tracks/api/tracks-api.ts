import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError, timeout } from 'rxjs';
import { TracksResponse } from '../../../../contract/tracks.interfaces';
import { TrackLookupResult } from '../../../../contract/tracks.types';
import { ISRC_QUERY_PARAM, TRACKS_API_URL, TRACKS_REQUEST_TIMEOUT_MS } from './api.constants';
import { TracksUnavailableError } from './tracks-unavailable-error';

/** Client of the BFF `GET /api/tracks`. Any failure becomes a `TracksUnavailableError`. */
@Injectable({ providedIn: 'root' })
export class TracksApi {
  private readonly _http = inject(HttpClient);

  public lookup(isrcs: readonly string[]): Observable<readonly TrackLookupResult[]> {
    if (isrcs.length === 0) {
      return of([]);
    }

    const params = new HttpParams().set(ISRC_QUERY_PARAM, isrcs.join(','));
    return this._http.get<TracksResponse>(TRACKS_API_URL, { params }).pipe(
      timeout(TRACKS_REQUEST_TIMEOUT_MS),
      map((response) => response.results),
      catchError((cause: unknown) => throwError(() => new TracksUnavailableError(cause))),
    );
  }
}

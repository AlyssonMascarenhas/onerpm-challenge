export enum TracksLoadStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  READY = 'ready',
  /** The music data provider could not be reached at all. */
  UNAVAILABLE = 'unavailable',
}

/** The order of the tracks by title; ISRCs without a track always stay after them. */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

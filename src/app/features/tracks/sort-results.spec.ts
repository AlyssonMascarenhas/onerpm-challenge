import { LookupStatus } from '../../../contract/tracks.enums';
import { sortResults } from './sort-results';
import { errorResult, foundResult, notFoundResult, titles } from './testing/builders';

describe('sortResults', () => {
  it('orders found tracks alphabetically by title', () => {
    const sorted = sortResults([
      foundResult('Quase Nua'),
      foundResult('Louca'),
      foundResult('Repente'),
    ]);

    expect(titles(sorted)).toEqual(['Louca', 'Quase Nua', 'Repente']);
  });

  it('ignores case', () => {
    const sorted = sortResults([
      foundResult('banana'),
      foundResult('Apple'),
      foundResult('cherry'),
    ]);

    expect(titles(sorted)).toEqual(['Apple', 'banana', 'cherry']);
  });

  it('ignores accents, so É files under E', () => {
    const sorted = sortResults([
      foundResult('Zebra'),
      foundResult('Érica'),
      foundResult('Eduardo'),
      foundResult('Dani'),
    ]);

    expect(titles(sorted)).toEqual(['Dani', 'Eduardo', 'Érica', 'Zebra']);
  });

  it('ignores leading punctuation: "...É pra Você" is not sorted before "A"', () => {
    const sorted = sortResults([
      foundResult('Quem Diria'),
      foundResult('...É pra Você'),
      foundResult('Louca'),
    ]);

    expect(titles(sorted)).toEqual(['...É pra Você', 'Louca', 'Quem Diria']);
  });

  it('compares numbers by value', () => {
    const sorted = sortResults([
      foundResult('Track 10'),
      foundResult('Track 2'),
      foundResult('Track 1'),
    ]);

    expect(titles(sorted)).toEqual(['Track 1', 'Track 2', 'Track 10']);
  });

  it('puts Latin titles before Cyrillic ones, and sorts Cyrillic among themselves', () => {
    const sorted = sortResults([
      foundResult('Нам не нравится'),
      foundResult('Repente'),
      foundResult('Доверюсь солнцу'),
      foundResult('IRON MAIDEN'),
    ]);

    expect(titles(sorted)).toEqual([
      'IRON MAIDEN',
      'Repente',
      'Доверюсь солнцу',
      'Нам не нравится',
    ]);
  });

  it('keeps the input order of tracks with the same title', () => {
    const first = foundResult('Louca', { id: 'first' });
    const second = foundResult('Louca', { id: 'second' });

    expect(sortResults([first, second])).toEqual([first, second]);
    expect(sortResults([second, first])).toEqual([second, first]);
  });

  it('is independent of the order it receives', () => {
    const results = ['d', 'a', 'c', 'b'].map((title) => foundResult(title));

    expect(titles(sortResults(results))).toEqual(titles(sortResults([...results].reverse())));
  });

  describe('results without a title', () => {
    it('places not-found and failed ISRCs after the tracks, not-found first, each ordered by ISRC', () => {
      const sorted = sortResults([
        errorResult('ZZ1AA0000002'),
        notFoundResult('BR1SP1200071'),
        foundResult('Zebra'),
        errorResult('AA1AA0000001'),
        notFoundResult('AA1AA0000009'),
        foundResult('Apple'),
      ]);

      expect(sorted.map((result) => [result.status, result.isrc])).toEqual([
        [LookupStatus.FOUND, 'BR1SP1200071'],
        [LookupStatus.FOUND, 'BR1SP1200071'],
        [LookupStatus.NOT_FOUND, 'AA1AA0000009'],
        [LookupStatus.NOT_FOUND, 'BR1SP1200071'],
        [LookupStatus.ERROR, 'AA1AA0000001'],
        [LookupStatus.ERROR, 'ZZ1AA0000002'],
      ]);
      expect(titles(sorted).slice(0, 2)).toEqual(['Apple', 'Zebra']);
    });
  });

  it('returns a new array and leaves the input untouched', () => {
    const input = [foundResult('b'), foundResult('a')];
    const snapshot = [...input];

    const sorted = sortResults(input);

    expect(sorted).not.toBe(input);
    expect(input).toEqual(snapshot);
  });

  it('handles an empty list', () => {
    expect(sortResults([])).toEqual([]);
  });

  it('accepts another locale, e.g. to follow a language-specific alphabet', () => {
    const sorted = sortResults([foundResult('Z'), foundResult('Ä')], 'sv');

    expect(titles(sorted)).toEqual(['Z', 'Ä']);
  });
});

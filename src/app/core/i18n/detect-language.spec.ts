import { detectLanguage, parseAcceptLanguage, toSupportedLanguage } from './detect-language';
import { Language } from './i18n.enums';

describe('toSupportedLanguage', () => {
  it.each([
    ['en', Language.EN],
    ['pt', Language.PT],
    ['es', Language.ES],
    ['ru', Language.RU],
    ['fr', Language.FR],
    ['tr', Language.TR],
  ])('accepts %s', (tag, expected) => {
    expect(toSupportedLanguage(tag)).toBe(expected);
  });

  it.each([
    ['pt-BR', Language.PT],
    ['pt-PT', Language.PT],
    ['es-419', Language.ES],
    ['ru-RU', Language.RU],
    ['fr-CA', Language.FR],
    ['tr_TR', Language.TR],
    ['EN-us', Language.EN],
    [' TR ', Language.TR],
  ])('matches the regional variant %s by its primary subtag', (tag, expected) => {
    expect(toSupportedLanguage(tag)).toBe(expected);
  });

  it.each([['de'], ['ja-JP'], ['zh-Hans'], ['xx'], [''], ['  '], ['-'], [null], [undefined]])(
    'rejects %s',
    (tag) => {
      expect(toSupportedLanguage(tag)).toBeNull();
    },
  );

  it('does not match a language by a longer prefix ("english" is not "en")', () => {
    expect(toSupportedLanguage('english')).toBeNull();
  });
});

describe('detectLanguage', () => {
  it('uses the first candidate that is supported, in priority order', () => {
    expect(detectLanguage([Language.RU, 'fr-FR', 'tr'])).toBe(Language.RU);
  });

  it('skips unsupported and empty candidates', () => {
    expect(detectLanguage([null, undefined, 'de-DE', 'ja', 'es-MX', 'fr'])).toBe(Language.ES);
  });

  it('falls back to English when nothing matches', () => {
    expect(detectLanguage(['de', 'ja'])).toBe(Language.EN);
  });

  it('falls back to English with no candidates', () => {
    expect(detectLanguage([])).toBe(Language.EN);
  });
});

describe('parseAcceptLanguage', () => {
  it('returns the tags in header order when no weights are given', () => {
    expect(parseAcceptLanguage('pt-BR, en-US, fr')).toEqual(['pt-BR', 'en-US', 'fr']);
  });

  it('orders by weight, highest first', () => {
    expect(parseAcceptLanguage('en;q=0.5, tr;q=0.9, ru')).toEqual(['ru', 'tr', 'en']);
  });

  it('keeps the header order between tags with the same weight', () => {
    expect(parseAcceptLanguage('fr;q=0.8, es;q=0.8, pt;q=0.8')).toEqual(['fr', 'es', 'pt']);
  });

  it('parses a typical browser header', () => {
    expect(parseAcceptLanguage('tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7')).toEqual([
      'tr-TR',
      'tr',
      'en-US',
      'en',
    ]);
  });

  it('drops q=0 (not acceptable) and the wildcard', () => {
    expect(parseAcceptLanguage('de;q=0, *;q=0.5, fr')).toEqual(['fr']);
  });

  it('tolerates spaces around the weight', () => {
    expect(parseAcceptLanguage('en ; q = 0.3 , ru ; q = 0.9')).toEqual(['ru', 'en']);
  });

  it.each([[null], [undefined], [''], [' , ,']])('returns nothing for %j', (header) => {
    expect(parseAcceptLanguage(header)).toEqual([]);
  });

  it('ignores an unparseable weight instead of failing', () => {
    expect(parseAcceptLanguage('en;q=abc, fr')).toEqual(['fr']);
  });
});

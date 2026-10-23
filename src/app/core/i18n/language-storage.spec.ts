import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LANGUAGE_STORAGE_KEY } from './i18n.constants';
import { Language } from './i18n.enums';
import { LanguageStorage } from './language-storage';

function create(platform: 'browser' | 'server' = 'browser'): LanguageStorage {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  return TestBed.inject(LanguageStorage);
}

describe('LanguageStorage', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  describe('in the browser', () => {
    it('reads nothing when no language was saved', () => {
      expect(create().read()).toBeNull();
    });

    it('reads back what it wrote', () => {
      const storage = create();

      storage.write(Language.RU);

      expect(storage.read()).toBe(Language.RU);
      expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ru');
    });

    it('overwrites the previous choice', () => {
      const storage = create();
      storage.write(Language.RU);

      storage.write(Language.FR);

      expect(storage.read()).toBe(Language.FR);
    });

    it.each([['de'], ['xx'], ['<script>'], ['']])(
      'ignores a stored value that is not a supported language (%j)',
      (value) => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, value);

        expect(create().read()).toBeNull();
      },
    );

    it('normalizes a stored regional tag', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'pt-BR');

      expect(create().read()).toBe(Language.PT);
    });

    it('survives storage that throws on read (private mode, blocked cookies)', () => {
      const storage = create();
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });

      expect(storage.read()).toBeNull();
    });

    it('survives storage that throws on write (quota exceeded)', () => {
      const storage = create();
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('full', 'QuotaExceededError');
      });

      expect(() => storage.write(Language.TR)).not.toThrow();
    });
  });

  describe('on the server', () => {
    it('reads nothing, even if a value exists', () => {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, 'ru');

      expect(create('server').read()).toBeNull();
    });

    it('does not write', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem');

      create('server').write(Language.RU);

      expect(setItem).not.toHaveBeenCalled();
    });
  });
});

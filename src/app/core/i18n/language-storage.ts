import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { LANGUAGE_STORAGE_KEY } from './i18n.constants';
import { Language } from './i18n.enums';
import { toSupportedLanguage } from './detect-language';

/**
 * The visitor's saved language. Storage can be missing (server render) or throw (private mode,
 * blocked cookies), and the page must keep working in both cases.
 */
@Injectable({ providedIn: 'root' })
export class LanguageStorage {
  private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  public read(): Language | null {
    if (!this._isBrowser) {
      return null;
    }
    try {
      return toSupportedLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  public write(language: Language): void {
    if (!this._isBrowser) {
      return;
    }
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Not persisted this time; the language still applies to the current visit.
    }
  }
}

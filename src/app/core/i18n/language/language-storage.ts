import { Injectable, inject } from '@angular/core';
import { SafeStorage } from '../../storage/safe-storage';
import { toSupportedLanguage } from './detect-language';
import { LANGUAGE_STORAGE_KEY } from '../i18n.constants';
import { Language } from '../i18n.enums';

/** The visitor's saved language. A stored value that is not a supported language is ignored. */
@Injectable({ providedIn: 'root' })
export class LanguageStorage {
  private readonly _storage = inject(SafeStorage);

  public read(): Language | null {
    return toSupportedLanguage(this._storage.read(LANGUAGE_STORAGE_KEY));
  }

  public write(language: Language): void {
    this._storage.write(LANGUAGE_STORAGE_KEY, language);
  }
}

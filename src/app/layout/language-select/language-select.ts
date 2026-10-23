import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { translateSignal } from '@jsverse/transloco';
import { Select } from 'primeng/select';
import { I18n } from '../../core/i18n/i18n';
import { Language } from '../../core/i18n/i18n.enums';

/** Language picker. Each name is written in its own language and tagged with it for screen readers. */
@Component({
  selector: 'orp-language-select',
  imports: [FormsModule, Select],
  templateUrl: './language-select.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelect {
  protected readonly i18n = inject(I18n);
  protected readonly label = translateSignal('app.language');
  /** PrimeNG types its options as a mutable array. */
  protected readonly options = [...this.i18n.options];

  protected select(language: Language): void {
    // A language that fails to load simply leaves the current one in place.
    this.i18n.setLanguage(language).catch(() => undefined);
  }
}

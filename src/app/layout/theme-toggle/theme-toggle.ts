import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Theme } from '../../core/theme/theme';

/** Light/dark switch. The label names the action it will perform, which is what assistive tech needs. */
@Component({
  selector: 'orp-theme-toggle',
  imports: [Button],
  template: `
    <p-button
      severity="secondary"
      [rounded]="true"
      [text]="true"
      [buttonProps]="{ autofocus: false }"
      [icon]="icon()"
      [ariaLabel]="label()"
      (onClick)="theme.toggle()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggle {
  protected readonly theme = inject(Theme);
  private readonly _toDark = translateSignal('app.theme.toDark');
  private readonly _toLight = translateSignal('app.theme.toLight');

  protected readonly label = computed(() =>
    this.theme.isDark() ? this._toLight() : this._toDark(),
  );
  /** The icon shows the theme you would switch to. */
  protected readonly icon = computed(() => (this.theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'));
}

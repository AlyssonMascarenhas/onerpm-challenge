import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { TranslocoService, translateSignal } from '@jsverse/transloco';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { I18n } from '../../../core/i18n/i18n';
import { CopyButton } from '../../../shared/copy-button/copy-button';
import { IsrcListItem } from './isrc-list-dialog.interfaces';

/**
 * A modal list of ISRCs, each one copyable, with a button that copies them all (one per line). The page uses it
 * for the ISRCs that are not in the database and for the ones whose lookup failed (which can be tried again).
 */
@Component({
  selector: 'orp-isrc-list-dialog',
  imports: [Button, CopyButton, Dialog],
  templateUrl: './isrc-list-dialog.html',
  styleUrl: './isrc-list-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IsrcListDialog {
  public readonly isrcs = input.required<readonly string[]>();
  public readonly title = input.required<string>();
  public readonly hint = input.required<string>();
  /** The accessible name of the list. */
  public readonly listLabel = input.required<string>();
  /** Offers "try again" next to "copy all". */
  public readonly retryable = input(false);

  /** Whether the dialog is open (two-way). */
  public readonly visible = model(false);

  public readonly retry = output<void>();
  /** The dialog has closed, by any means: the page uses it to give the focus back. */
  public readonly closed = output<void>();

  private readonly _transloco = inject(TranslocoService);
  private readonly _i18n = inject(I18n);

  protected readonly closeLabel = translateSignal('status.close');
  protected readonly retryLabel = translateSignal('status.retry');
  protected readonly copyAllLabel = translateSignal('copy.copyAll');
  protected readonly copiedLabel = translateSignal('copy.copied');

  /** One entry per ISRC, with the name of its copy button (it follows the language). */
  protected readonly items = computed<readonly IsrcListItem[]>(() => {
    this._i18n.locale();
    return this.isrcs().map((isrc) => ({
      isrc,
      label: this._transloco.translate('copy.copyIsrc', { isrc }),
    }));
  });

  /** All the ISRCs, one per line: what "copy all" puts on the clipboard. */
  protected readonly allText = computed(() => this.isrcs().join('\n'));
}

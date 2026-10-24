import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { LookupStatus } from '../../../../../contract/tracks.enums';
import { CopyButton } from '../../../../shared/copy-button/copy-button';
import { UnresolvedStatus } from '../../domain/domain.types';

/**
 * An ISRC that did not become a track: Spotify does not know it, or the lookup failed.
 * It stays on the page so the producer can see exactly which of the codes did not come back.
 */
@Component({
  selector: 'orp-isrc-card',
  imports: [CopyButton],
  templateUrl: './isrc-card.html',
  styleUrl: './isrc-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IsrcCard {
  public readonly isrc = input.required<string>();
  public readonly status = input.required<UnresolvedStatus>();

  private readonly _notFound = translateSignal('tracks.notFound');
  private readonly _failed = translateSignal('tracks.failed');

  protected readonly copyLabel = translateSignal('copy.copyIsrc', { isrc: this.isrc });
  protected readonly copied = translateSignal('copy.copied');

  protected readonly isNotFound = computed(() => this.status() === LookupStatus.NOT_FOUND);
  protected readonly message = computed(() =>
    this.isNotFound() ? this._notFound() : this._failed(),
  );
  protected readonly icon = computed(() =>
    this.isNotFound() ? 'pi pi-search' : 'pi pi-exclamation-triangle',
  );
}

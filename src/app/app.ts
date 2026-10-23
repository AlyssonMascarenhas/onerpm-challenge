import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { translateSignal } from '@jsverse/transloco';
import { AppHeader } from './layout/app-header/app-header';

@Component({
  selector: 'orp-root',
  imports: [RouterOutlet, AppHeader],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly skipToContent = translateSignal('app.skipToContent');
}

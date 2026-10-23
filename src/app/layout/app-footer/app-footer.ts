import { ChangeDetectionStrategy, Component } from '@angular/core';
import { translateSignal } from '@jsverse/transloco';
import { AUTHOR_NAME, AUTHOR_URL, REPOSITORY_URL } from '../layout.constants';

/** Credits: who built it and for what, the source code, and where the data comes from. */
@Component({
  selector: 'orp-app-footer',
  templateUrl: './app-footer.html',
  styleUrl: './app-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppFooter {
  protected readonly authorName = AUTHOR_NAME;
  protected readonly authorUrl = AUTHOR_URL;
  protected readonly repositoryUrl = REPOSITORY_URL;

  protected readonly builtFor = translateSignal('footer.builtFor');
  protected readonly sourceCode = translateSignal('footer.sourceCode');
  protected readonly dataFrom = translateSignal('footer.dataFrom');
  protected readonly newTab = translateSignal('app.newTab');
}

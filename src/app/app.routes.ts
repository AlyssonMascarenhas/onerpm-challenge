import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/tracks/tracks-page/tracks-page').then((module) => module.TracksPage),
  },
  { path: '**', redirectTo: '' },
];

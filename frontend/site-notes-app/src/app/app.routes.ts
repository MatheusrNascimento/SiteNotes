import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'references',
  },
  {
    path: 'references',
    loadComponent: () =>
      import('./references/reference-list/reference-list').then((m) => m.ReferenceList),
  },
  {
    path: 'references/:id',
    loadComponent: () =>
      import('./references/reference-detail/reference-detail').then((m) => m.ReferenceDetail),
  },
];

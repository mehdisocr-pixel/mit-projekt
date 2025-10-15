import { Routes } from '@angular/router';

export const GEOGRAFISK_LOKATION_ROUTES: Routes = [
  {
    path: '',
    title: 'Geografisk lokationsdatabase',
    loadComponent: () =>
      import('./workbench/geo-workbench.component')
        .then(m => m.GeoWorkbenchComponent)
  },

  // gamle deep-links? Send dem til workbench
  { path: 'building/create', redirectTo: '', pathMatch: 'full' },
  { path: 'section/create',  redirectTo: '', pathMatch: 'full' },

  // fallback
  { path: '**', redirectTo: '' }
];

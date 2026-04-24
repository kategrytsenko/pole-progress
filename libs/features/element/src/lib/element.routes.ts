import { Routes } from '@angular/router';

export const elementRoutes: Routes = [
  {
    path: ':id',
    title: 'Елемент',
    loadComponent: () => import('./pages/element.page').then((m) => m.ElementPage),
  },
];

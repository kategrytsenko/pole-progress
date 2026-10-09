import { Routes } from '@angular/router';

export const elementRoutes: Routes = [
  {
    path: ':id',
    title: 'Прогрес елемента',
    data: { diary: 'own' },
    loadComponent: () => import('./pages/element.page').then((m) => m.ElementPage),
  },
];

import { Routes } from '@angular/router';

export const scheduleRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Розклад',
    loadComponent: () => import('./pages/schedule.page').then((m) => m.SchedulePage),
  },
];

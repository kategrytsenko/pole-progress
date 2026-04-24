import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Прогрес',
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
  },
];

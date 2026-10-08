import { Routes } from '@angular/router';

export const dashboardRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Щоденник',
    loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage),
  },
];

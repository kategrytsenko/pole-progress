import { Routes } from '@angular/router';
import { authOnlyGuard } from '@org/auth';

export const shellRoutes: Routes = [
  {
    path: '',
    canMatch: [authOnlyGuard],
    loadComponent: () => import('./pages/app-shell.page').then((m) => m.AppShellPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./pages/app-home.page').then((m) => m.AppHomePage),
      },
    ],
  },
];

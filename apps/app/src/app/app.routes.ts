import { Route } from '@angular/router';
import { authRoutes } from '@org/auth';

export const appRoutes: Route[] = [
  ...authRoutes,
  {
    path: 'admin',
    loadChildren: () => import('@org/admin').then((m) => m.adminRoutes),
  },
  {
    path: 'app',
    loadChildren: () => import('@org/shell').then((m) => m.shellRoutes),
  },
  {
    path: 'forbidden',
    title: 'Доступ обмежено',
    loadComponent: () =>
      import('./pages/forbidden.page').then((m) => m.ForbiddenPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app',
  },
  {
    path: '**',
    title: 'Сторінку не знайдено',
    loadComponent: () =>
      import('./pages/not-found.page').then((m) => m.NotFoundPage),
  },
];

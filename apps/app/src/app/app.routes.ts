import { Route } from '@angular/router';
import {
  ProfilePage,
  adminOnlyGuard,
  authRoutes,
  profileCompletionGuard,
  studioAccessGuard,
} from '@org/auth';

export const appRoutes: Route[] = [
  ...authRoutes,
  {
    path: 'admin',
    loadChildren: () => import('@org/admin').then((m) => m.adminRoutes),
  },
  {
    path: 'app',
    loadChildren: () =>
      import('@org/shell').then((m) =>
        m.createShellRoutes([
          {
            path: 'profile',
            title: 'Профіль',
            component: ProfilePage,
          },
          {
            path: 'elements',
            canMatch: [profileCompletionGuard],
            loadChildren: () => import('@org/element').then((mod) => mod.elementRoutes),
          },
          {
            path: 'schedule',
            loadChildren: () => import('@org/schedule').then((mod) => mod.scheduleRoutes),
          },
          {
            path: 'journals',
            loadChildren: () => import('@org/students').then((mod) => mod.journalsRoutes),
          },
          {
            path: 'students',
            canMatch: [studioAccessGuard, adminOnlyGuard],
            loadChildren: () => import('@org/students').then((mod) => mod.studentsRoutes),
          },
          {
            path: '',
            canMatch: [profileCompletionGuard],
            loadChildren: () => import('@org/dashboard').then((mod) => mod.dashboardRoutes),
          },
        ]),
      ),
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

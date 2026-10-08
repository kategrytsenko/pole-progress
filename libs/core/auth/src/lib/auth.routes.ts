import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'sign-in',
    title: 'Вхід',
    loadComponent: () => import('./pages/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'auth/callback',
    title: 'Авторизація…',
    loadComponent: () => import('./pages/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
  {
    path: 'access-pending',
    title: 'Членство',
    loadComponent: () => import('./pages/access-pending.page').then((m) => m.AccessPendingPage),
  },
];

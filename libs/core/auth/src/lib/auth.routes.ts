import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'sign-in',
    loadComponent: () => import('./pages/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: 'auth/callback',
    loadComponent: () => import('./pages/auth-callback.page').then((m) => m.AuthCallbackPage),
  },
];

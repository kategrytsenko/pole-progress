import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'admin',
    loadChildren: () => import('@org/admin').then((m) => m.adminRoutes),
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./pages/forbidden.page').then((m) => m.ForbiddenPage),
  },
  {
    path: 'sign-in',
    loadComponent: () =>
      import('./pages/sign-in.page').then((m) => m.SignInPage),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'sign-in',
  },
];

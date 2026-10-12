import { Routes } from '@angular/router';
import { authOnlyGuard } from '@org/auth';

/** Layout route. Feature children are passed in by the app so shell does not depend on them. */
export function createShellRoutes(children: Routes): Routes {
  return [
    {
      path: '',
      canMatch: [authOnlyGuard],
      loadComponent: () => import('./pages/app-shell.page').then((m) => m.AppShellPage),
      children,
    },
  ];
}

import { Routes } from '@angular/router';
import { studioAccessGuard } from '@org/auth';

/** Layout route. Feature children are passed in by the app so shell does not depend on them. */
export function createShellRoutes(children: Routes): Routes {
  return [
    {
      path: '',
      canMatch: [studioAccessGuard],
      loadComponent: () => import('./pages/app-shell.page').then((m) => m.AppShellPage),
      children,
    },
  ];
}

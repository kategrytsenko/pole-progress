import { Routes } from '@angular/router';
import { adminOnlyGuard } from '@org/auth';

export const adminRoutes: Routes = [
  {
    path: '',
    canMatch: [adminOnlyGuard],
    loadComponent: () =>
      import('./pages/admin-shell.page').then((m) => m.AdminShellPage),
  },
];

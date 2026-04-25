import { Routes } from '@angular/router';
import { adminOnlyGuard } from '@org/auth';

export const adminRoutes: Routes = [
  {
    path: '',
    canMatch: [adminOnlyGuard],
    loadComponent: () => import('./pages/admin-shell.page').then((m) => m.AdminShellPage),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'categories' },
      {
        path: 'categories',
        title: 'Категорії — Адмін',
        loadComponent: () =>
          import('./pages/categories.page').then((m) => m.CategoriesPage),
      },
      {
        path: 'elements',
        title: 'Елементи — Адмін',
        loadComponent: () => import('./pages/elements.page').then((m) => m.ElementsPage),
      },
      {
        path: 'branding',
        title: 'Брендинг — Адмін',
        loadComponent: () => import('./pages/branding.page').then((m) => m.BrandingPage),
      },
    ],
  },
];

import { Routes } from '@angular/router';

export const journalsRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Щоденники',
    loadComponent: () => import('./pages/journals.page').then((m) => m.JournalsPage),
  },
  {
    path: ':studentId/elements/:id',
    title: 'Прогрес елемента',
    data: { diary: 'journal' },
    loadComponent: () => import('@org/element').then((m) => m.ElementPage),
  },
  {
    path: ':studentId',
    title: 'Публічний щоденник',
    data: { diary: 'journal' },
    loadComponent: () =>
      import('./pages/student-diary.page').then((m) => m.StudentDiaryPage),
  },
];

import { Routes } from '@angular/router';

export const studentsRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Учні',
    loadComponent: () => import('./pages/students.page').then((m) => m.StudentsPage),
  },
  {
    path: ':studentId/elements/:id',
    title: 'Прогрес елемента',
    loadComponent: () => import('@org/element').then((m) => m.ElementPage),
  },
  {
    path: ':studentId',
    title: 'Щоденник учня',
    loadComponent: () =>
      import('./pages/student-diary.page').then((m) => m.StudentDiaryPage),
  },
];

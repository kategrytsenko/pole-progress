import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

export const adminOnlyGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (!auth.isAuthed()) {
    const target = '/' + segments.map((s) => s.path).join('/');
    return router.createUrlTree(['/sign-in'], {
      queryParams: target && target !== '/' ? { redirect: target } : undefined,
    });
  }

  if (!auth.isAdmin()) return router.createUrlTree(['/forbidden']);

  return true;
};

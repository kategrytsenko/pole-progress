import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

export const adminOnlyGuard: CanMatchFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (!auth.isAuthed()) {
    return router.parseUrl('/sign-in');
  }

  if (!auth.isAdmin()) {
    return router.parseUrl('/forbidden');
  }

  return true;
};

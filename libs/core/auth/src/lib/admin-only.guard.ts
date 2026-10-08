import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { signInRedirect } from './auth-redirect';
import { AuthStore } from './auth.store';

export const adminOnlyGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  await auth.ensureAccessResolved();

  if (!auth.isAuthed()) return signInRedirect(router, segments);
  if (!auth.isAdmin()) return router.createUrlTree(['/forbidden']);
  return true;
};

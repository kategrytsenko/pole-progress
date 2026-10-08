import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { signInRedirect } from './auth-redirect';
import { AuthStore } from './auth.store';

/** Signed-in staff and clients with an active membership. Everyone else waits on the membership screen. */
export const studioAccessGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  await auth.ensureAccessResolved();
  if (!auth.isAuthed()) return signInRedirect(router, segments);
  if (auth.hasStudioAccess()) return true;
  return router.createUrlTree(['/access-pending']);
};

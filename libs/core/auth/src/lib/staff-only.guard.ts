import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

export const staffOnlyGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (!auth.isAuthed()) {
    const attempted = router.getCurrentNavigation()?.extractedUrl.toString();
    const fallback = '/' + segments.map((segment) => segment.path).join('/');
    const target = attempted && attempted !== '/' ? attempted : fallback;
    return router.createUrlTree(['/sign-in'], {
      queryParams: target && target !== '/' ? { redirect: target } : undefined,
    });
  }

  if (!auth.isStaff()) return router.createUrlTree(['/forbidden']);

  return true;
};

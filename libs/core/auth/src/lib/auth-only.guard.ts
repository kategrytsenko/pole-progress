import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

export const authOnlyGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  if (auth.isAuthed()) return true;

  const attempted = router.getCurrentNavigation()?.extractedUrl.toString();
  const fallback = '/' + segments.map((segment) => segment.path).join('/');
  const target = attempted && attempted !== '/' ? attempted : fallback;
  return router.createUrlTree(['/sign-in'], {
    queryParams: target && target !== '/' ? { redirect: target } : undefined,
  });
};

import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment, type UrlTree } from '@angular/router';
import {
  PROFILE_INCOMPLETE_NOTICE,
  safeInternalPath,
  signInRedirect,
} from './auth-redirect';
import { AuthStore } from './auth.store';
import { diaryAccessDecision } from './profile-gate';

/** Diary home and own-element routes. Schedule and journals do not use this guard. */
export const profileCompletionGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  await auth.ensureAccessResolved();
  const decision = diaryAccessDecision({
    authed: auth.isAuthed(),
    admin: auth.isAdmin(),
    profileComplete: auth.profileComplete(),
    studioAccess: auth.studioAccess(),
  });

  if (decision === 'allow') return true;
  if (decision === 'sign-in') return signInRedirect(router, segments);
  if (decision === 'membership') return router.createUrlTree(['/access-pending']);
  return profileCompletionRedirect(router, segments);
};

export function profileCompletionRedirect(router: Router, segments: UrlSegment[]): UrlTree {
  const attempted = router.getCurrentNavigation()?.extractedUrl.toString();
  const fallback = '/' + segments.map((segment) => segment.path).join('/');
  const raw = attempted && attempted !== '/' ? attempted : fallback;
  const target = safeInternalPath(raw);
  return router.createUrlTree(['/app/profile'], {
    queryParams: {
      notice: PROFILE_INCOMPLETE_NOTICE,
      ...(target ? { redirect: target } : {}),
    },
  });
}

import { Router, UrlSegment, type UrlTree } from '@angular/router';

/** Keeps post-login navigation inside this app. */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('\\') || path.includes('://')) return null;
  return path;
}

export function destinationAfterAuth(hasStudioAccess: boolean, requested: string | null | undefined): string {
  if (!hasStudioAccess) return '/access-pending';
  return safeInternalPath(requested) ?? '/app';
}

/** Build the sign-in redirect. Pass `router` from the guard before any await. */
export function signInRedirect(router: Router, segments: UrlSegment[]): UrlTree {
  const attempted = router.getCurrentNavigation()?.extractedUrl.toString();
  const fallback = '/' + segments.map((segment) => segment.path).join('/');
  const raw = attempted && attempted !== '/' ? attempted : fallback;
  const target = safeInternalPath(raw);
  return router.createUrlTree(['/sign-in'], {
    queryParams: target ? { redirect: target } : undefined,
  });
}

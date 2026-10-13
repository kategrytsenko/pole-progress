import { Router, UrlSegment, type UrlTree } from '@angular/router';

export const PROFILE_INCOMPLETE_NOTICE = 'incomplete';

/** Keeps post-login navigation inside this app. */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('\\') || path.includes('://')) return null;
  return path;
}

export interface PostAuthDestination {
  hasStudioAccess: boolean;
  profileComplete: boolean;
  requested: string | null | undefined;
}

/**
 * Schedule, public journals, and profile stay reachable without a pass.
 * An incomplete profile that asked for the diary is sent to the profile page
 * with that path kept. Everyone else without studio access still lands on
 * the membership screen.
 */
export function destinationAfterAuth(input: PostAuthDestination): string {
  const safe = safeInternalPath(input.requested);
  if (safe && isSignedInBrowsePath(safe)) return safe;
  if (safe && isOwnDiaryPath(safe) && !input.profileComplete) return profileCompletionPath(safe);
  if (!input.hasStudioAccess) return '/access-pending';
  return safe ?? '/app';
}

export function profileCompletionPath(returnPath: string | null | undefined): string {
  const params = new URLSearchParams();
  params.set('notice', PROFILE_INCOMPLETE_NOTICE);
  const safe = safeInternalPath(returnPath);
  if (safe && !isProfilePath(safe)) params.set('redirect', safe);
  return `/app/profile?${params.toString()}`;
}

export function isSignedInBrowsePath(path: string): boolean {
  const pathOnly = pathOnlyOf(path);
  return (
    pathOnly === '/app/schedule' ||
    pathOnly.startsWith('/app/schedule/') ||
    pathOnly === '/app/journals' ||
    pathOnly.startsWith('/app/journals/') ||
    isProfilePath(path)
  );
}

export function isOwnDiaryPath(path: string): boolean {
  const pathOnly = pathOnlyOf(path);
  return pathOnly === '/app' || pathOnly === '/app/' || pathOnly.startsWith('/app/elements');
}

function isProfilePath(path: string): boolean {
  const pathOnly = pathOnlyOf(path);
  return pathOnly === '/app/profile' || pathOnly.startsWith('/app/profile/');
}

function pathOnlyOf(path: string): string {
  return path.split('?')[0]?.split('#')[0] ?? path;
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

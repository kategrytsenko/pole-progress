import type { UserRole } from './profiles.api';

/** Admins skip the membership check. Everyone else needs the database to allow them. */
export function resolveStudioAccess(input: {
  role: UserRole | null;
  databaseAllows: boolean;
}): 'allowed' | 'restricted' {
  if (input.role === 'admin') return 'allowed';
  if (input.databaseAllows) return 'allowed';
  return 'restricted';
}

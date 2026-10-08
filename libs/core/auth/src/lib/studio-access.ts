import type { UserRole } from './profiles.api';

/** Staff skip the membership check. Everyone else needs the database to allow them. */
export function resolveStudioAccess(input: {
  role: UserRole | null;
  databaseAllows: boolean;
}): 'allowed' | 'restricted' {
  if (input.role === 'admin' || input.role === 'instructor') return 'allowed';
  if (input.databaseAllows) return 'allowed';
  return 'restricted';
}

import type { UserRole } from '@org/auth';
import { currentClientPass, studentLabel, type ClientPass } from '@org/data';

export interface ClientDirectoryProfile {
  id: string;
  name: string | null;
  role: UserRole;
}

export interface ClientDirectoryRow {
  id: string;
  name: string;
  email: string | null;
  role: UserRole;
  membership: ClientPass | null;
}

export function buildClientDirectory(
  profiles: readonly ClientDirectoryProfile[],
  emails: ReadonlyMap<string, string>,
  passes: readonly ClientPass[],
  now: Date,
): ClientDirectoryRow[] {
  const byUser = new Map<string, ClientPass[]>();
  for (const pass of passes) {
    const list = byUser.get(pass.user_id);
    if (list) list.push(pass);
    else byUser.set(pass.user_id, [pass]);
  }

  return profiles.map((profile) => ({
    id: profile.id,
    name: studentLabel(profile.name),
    email: emails.get(profile.id) ?? null,
    role: profile.role,
    membership: currentClientPass(byUser.get(profile.id) ?? [], now),
  }));
}

export function filterClientDirectory(
  rows: readonly ClientDirectoryRow[],
  query: string,
): ClientDirectoryRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter((row) => {
    const email = row.email?.toLowerCase() ?? '';
    return (
      row.name.toLowerCase().includes(needle) ||
      email.includes(needle) ||
      row.id.toLowerCase().includes(needle)
    );
  });
}

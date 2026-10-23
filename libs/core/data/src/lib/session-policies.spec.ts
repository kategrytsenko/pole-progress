import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../supabase/migrations',
);

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();
}

function readMigration(name: string): string {
  return readFileSync(join(migrationsDir, name), 'utf8');
}

function policyBody(sql: string, name: string): string {
  const marker = `create policy "${name}"`;
  const start = sql.lastIndexOf(marker);
  const end = sql.indexOf(';', start);
  return sql.slice(start, end);
}

describe('class session write policies', () => {
  const files = migrationFiles();
  const dropFile = files.find((name) => name.endsWith('_drop_class_session_delete_policy.sql'));
  const roleFile = '20261012201704_remove_instructor_role.sql';
  const originalFile = '202610080001_schedule_bookings_passes.sql';

  it('removes the admin delete policy and the delete grant', () => {
    expect(dropFile).toBeTruthy();
    if (!dropFile) return;
    const sql = readMigration(dropFile);

    expect(sql).toContain('drop policy if exists "class_sessions_delete_staff" on public.class_sessions;');
    expect(sql.toLowerCase()).toContain(
      'revoke delete on table public.class_sessions from anon, authenticated;',
    );
    expect(sql.toLowerCase()).not.toContain('create policy');
    expect(sql).not.toContain('class_sessions_insert_staff');
    expect(sql).not.toContain('class_sessions_update_staff');
    expect(sql).not.toContain('class_types_');
    expect(sql).not.toContain('bookings_insert');
  });

  it('keeps admin-only insert and update for class types and sessions', () => {
    const sql = readMigration(roleFile);

    for (const name of [
      'class_types_insert_staff',
      'class_types_update_staff',
      'class_sessions_insert_staff',
      'class_sessions_update_staff',
    ]) {
      const body = policyBody(sql, name);
      expect(body).toContain('public.is_admin()');
      expect(body).not.toContain('public.is_staff()');
      expect(body).not.toContain('using (true)');
      expect(body).not.toContain('with check (true)');
    }

    const removed = policyBody(sql, 'class_sessions_delete_staff');
    expect(removed).toContain('for delete');
    expect(removed).toContain('public.is_admin()');
  });

  it('does not recreate session delete after the role migration except to drop it', () => {
    const later = files.filter((name) => name > roleFile && name !== dropFile);
    for (const name of later) {
      const sql = readMigration(name);
      expect(sql).not.toContain('class_sessions_delete_staff');
      expect(sql).not.toContain('create policy "class_sessions_insert_staff"');
      expect(sql).not.toContain('create policy "class_sessions_update_staff"');
      expect(sql).not.toContain('create policy "class_types_insert_staff"');
      expect(sql).not.toContain('create policy "class_types_update_staff"');
    }
  });

  it('records why a session delete is unsafe and that the schedule read ignores the active flag', () => {
    const original = readMigration(originalFile);
    expect(original).toContain(
      'session_id uuid not null references public.class_sessions(id) on delete cascade',
    );
    expect(original).toContain('create policy "class_sessions_delete_staff"');
    expect(original).toContain(
      'grant select, insert, update, delete on public.class_sessions to authenticated;',
    );

    const rpc = readMigration('20261013114234_profile_completion_gates.sql');
    const start = rpc.indexOf('create or replace function public.list_sessions_in_range');
    const fn = rpc.slice(start, rpc.indexOf('$$;', start));
    expect(fn).toContain('join public.class_types ct on ct.id = s.type_id');
    expect(fn).not.toContain('ct.active');
    expect(fn).toContain("b.status = 'booked'");
  });
});

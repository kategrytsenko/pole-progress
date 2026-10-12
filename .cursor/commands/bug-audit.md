# Investigate a bug

Read the project rules and `docs/ROADMAP.md` first.

Investigate the reported issue without changing files, database state, migrations, production settings, or user data.

Trace the complete flow across UI, state/store, API/service, Supabase Auth, database constraints, RLS, RPCs and Storage as relevant.

Return:

1. Reproduction steps and observed versus expected behavior.
2. The most likely root cause, backed by concrete files and code.
3. Other plausible causes and how to distinguish them.
4. The smallest safe fix.
5. Tests needed, including authorization and regression cases.
6. Whether existing test accounts or database state need any cleanup.

Do not execute mutations or implement the fix until explicitly asked.

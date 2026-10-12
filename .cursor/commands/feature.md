# Implement a feature

Before coding:

1. Read `.cursor/rules/pole-progress.mdc` and `docs/ROADMAP.md`.
2. Inspect the existing implementation, related tests, database schema, RLS policies, and migrations.
3. Identify the smallest complete implementation and any security implications.
4. Briefly state the plan and files likely to change.

Implementation:

* Follow project rules and reuse existing patterns.
* Add a new migration for database changes; never edit an already-applied migration.
* Preserve Auth, RLS, role boundaries, and Storage security.
* Add or update relevant tests.
* Do not run destructive database commands or change production settings without explicit approval.

Before finishing:

1. Run the relevant tests and `npx nx build app` where practical.
2. Update `docs/ROADMAP.md` in the same task: mark completed items, record relevant routes, libraries, migrations and tests, and revise remaining work.
3. If the roadmap cannot be updated accurately, explain why and leave the task explicitly incomplete.
4. Summarize changed files, database/deployment steps, test results, and any manual verification still needed.

Do not claim a feature is verified merely because it compiles.

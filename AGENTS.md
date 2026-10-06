<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

# Project-Specific Guidelines (Pole Progress)

- **Tech Stack:** Angular 21, AnalogJS (Vite-plugin-angular), Tailwind CSS, Supabase, Nx Monorepo.
- **Task Execution:** Always run commands via `npx nx <target> <project-name>` (e.g., `npx nx serve app`). Do not rely on npm scripts if they are not defined.
- **Styling:** Use Tailwind CSS classes. Keep components modular inside `libs/features/` and `libs/core/`.
- **Database & Auth:** Supabase is used for authentication and database operations, with migrations located in `supabase/migrations/`.
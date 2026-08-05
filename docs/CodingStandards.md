# Coding Standards

- Use TypeScript for all new feature code after Day 1 scaffolding.
- Give each module one clear responsibility.
- Keep functions small, named by intent, and easy to test.
- Validate every boundary: UI input, AI output, tool arguments, and persisted data.
- Never execute AI-generated commands or filesystem paths without validation.
- Prefer explicit interfaces over unstructured objects.
- Write tests for permission decisions, tool inputs, and data migrations.
- Avoid duplicate logic; extract shared modules deliberately.
- Comment decisions and constraints, not obvious code.
- Use Conventional Commit-style messages, for example `feat: add local chat`.


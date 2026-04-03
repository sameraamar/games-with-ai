# Copilot Instructions

## File Purpose
- What this file is: Repository-wide instructions for AI coding agents working in this project.
- Why it exists: It keeps implementation behavior consistent across fresh sessions and reduces drift from the documented workflow.
- How AI agents will use it: AI agents must treat this file as always-on guidance before making changes.

## Maintenance Instructions
- When to update it: Update when the repository workflow, documentation structure, review expectations, or architectural constraints change.
- Who updates it: Humans and AI may update this file, but changes should stay aligned with docs/START_HERE.md and docs/design/design.md.
- How it relates to other docs: This file defines behavioral rules for implementation. The design docs and tasks define what should be built and tracked.

## Before ANY implementation work
- Read docs/START_HERE.md.
- Read docs/tasks.md.
- Read docs/design/design.md first.
- Read only the relevant detailed design subdocuments if they exist.

## After ANY implementation work
- Update docs/tasks.md.
- Update docs/design/design.md when project-level behavior or structure changed.
- Update only the relevant detailed design subdocuments when needed.

## Code Change Rules
- Make the smallest possible diff that satisfies the task.
- Do not reformat unrelated code.
- Do not rename files, functions, or symbols unless the task requires it.
- Preserve ordering, imports, whitespace, comments, and public behavior unless the task calls for change.
- Maintain static-hosting compatibility unless the docs are updated first.

## Refactoring Rules
- Refactoring must be tracked as a task.
- Keep refactors separate from unrelated behavior changes when practical.
- Prefer reviewable, low-risk diffs.

## Documentation Rules
- Documentation is the source of truth for intended behavior.
- If implementation diverges from design, update the relevant docs before or with the code change.
- Do not mark tasks complete without real validation.

## Repository Structure
- `games/` — all playable games, one subfolder per game (e.g. `games/Pong/`, `games/GemVault/`)
- `index.html`, `favicon.ico`, `README.md` — root-level cross-cutting files served by the static host
- `docs/` — design documents and task tracking
- `tests/` — test scripts
- `temp/` — local-only scratch files, git-ignored; all generated files (screenshots, dumps) go here

## Temporary Files
- All temporary files (screenshots, debug dumps, generated images, test output, etc.) must go into a `temp/` folder at the repository root.
- The `temp/` folder is git-ignored — never commit anything from it.
- Do not place temporary or scratch files in the repository root or any other tracked directory.
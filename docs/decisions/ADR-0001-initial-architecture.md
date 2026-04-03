# ADR-0001 Initial Architecture

## File Purpose
- What this file is: An architectural decision record for the initial project architecture.
- Why it exists: It preserves the reasoning behind major structural choices so future contributors do not have to infer them from code alone.
- How AI agents will use it: AI agents should read ADRs before proposing structural changes and should create new ADRs when making consequential architecture decisions.

## Maintenance Instructions
- When to update it: Do not rewrite the decision after acceptance except for minor clarifications. Create a new ADR when superseding this decision.
- Who updates it: Humans or AI may author ADRs, but major architectural changes should be reviewed explicitly.
- How it relates to other docs: ADRs complement the design docs by recording why a direction was chosen, not just what the current state is.

## Status
Accepted

## Context
The project is a public personal and experimental portfolio of browser games intended for instant play and simple hosting. The existing repository already shows a pattern of separate game folders, direct static routes, and browser-only execution. The project needs an architecture that preserves low operational cost, direct access to each game, and future AI recoverability through documentation.

Some product details may continue to evolve during implementation. Initialization therefore favors a documented baseline with explicit placeholders over waiting for complete information.

## Decision
Adopt a static multi-entry architecture with:
- A root landing page for collection discovery.
- Standalone game folders with direct playable routes.
- Browser-only execution with no required backend.
- Local persistence via browser storage where useful.
- Documentation under docs as the source of truth for future implementation work.

## Rationale
- Static hosting keeps deployment simple and aligned with the current repo.
- Separate entry points preserve independence between games.
- Avoiding a backend prevents unnecessary operational complexity.
- Documentation-first design supports fresh AI sessions and future code regeneration.

## Consequences

### Positive
- Easy deployment to GitHub Pages or equivalent static hosts.
- Clear route ownership per game.
- Low infrastructure overhead.
- Easier incremental additions to the collection.

### Negative
- Some code patterns may be repeated across games.
- Shared features across games require explicit coordination.
- Advanced platform features like accounts or multiplayer would require re-architecture.

## Alternatives Considered
- Single-page application shell for the entire collection: Rejected because it adds coupling and unnecessary runtime complexity.
- Backend-supported platform architecture: Rejected because it conflicts with current goals and hosting constraints.
- Monolithic design documentation file: Rejected because modular docs are easier for humans and AI to navigate and update.

## Supersession Rule
If the project adds backend services, cross-game progression, accounts, or a shared application runtime, create a new ADR before proceeding.
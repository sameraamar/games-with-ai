# Constraints

This document is part of the modular project design documentation.
Content may be incomplete early in the project.

Missing or placeholder sections are expected.

AI agents and humans should:
- Refine this document over time
- Update it after related implementation tasks
- Use it to enable fresh AI sessions

Do NOT assume this document is final.
Treat it as a living design artifact.

## File Purpose
- What this file is: The explicit limits, guardrails, and non-negotiable conditions for the project.
- Why it exists: It prevents implementation work from drifting into architectures or features that break the intended operating model.
- How AI agents will use it: AI agents should read this before making technical proposals and must treat these constraints as binding unless the docs are deliberately revised.

## Maintenance Instructions
- When to update it: Update when platform, policy, performance, privacy, or hosting assumptions materially change.
- Who updates it: Humans should approve constraint changes; AI may propose changes when the current constraint set conflicts with real project needs.
- How it relates to other docs: This file limits the solution space used by the requirements, architecture, tech stack, testing, and deployment docs.

## Hard Constraints

### Static Hosting Constraint
- The project must remain deployable as a static site.
- No required feature may depend on a backend service, API server, or database.

### No Account System Constraint
- The current product must not require sign-in, user accounts, or cloud identity flows.

### Privacy Constraint
- User state should remain local unless the product direction intentionally changes.
- Avoid collecting personal data or introducing telemetry without explicit documentation updates.

### Lightweight Runtime Constraint
- The project should stay small enough for quick browser load and low operational overhead.
- Avoid adding heavy frameworks or runtime layers without documented justification.

## UX Constraints
- Time-to-play should remain short.
- Controls and primary actions must be understandable quickly.
- Desktop-first limitations must be stated for games that rely on keyboard, fullscreen, or pointer lock.
- Mobile support is desirable for suitable games but should not force compromised design in desktop-first experiences.

## Technical Constraints
- Deep links into individual game pages must continue to work.
- Local persistence must tolerate missing or failing browser storage gracefully.
- Optional browser features must not cause full-site failure when unavailable.
- Changes should preserve folder-level independence unless a documented shared abstraction is introduced.

## Performance Constraints
- Avoid unnecessary asset bloat.
- Avoid runtime work that meaningfully degrades gameplay responsiveness on normal consumer hardware.
- Prefer simple data flows over generalized infrastructure.

## Content and Scope Constraints
- The project is a collection of games, not a generalized game platform.
- Cross-game progression, monetization systems, and online multiplayer are out of scope unless explicitly re-scoped.
- Educational features may exist within a game, but they should not impose platform-wide complexity.

## Compliance and Security Notes
- No current regulatory compliance target is implied by the repo.
- If future work introduces analytics, monetization, or user data exchange, revisit privacy and legal assumptions before implementation.

## Constraint Escalation Rule
- If a requested change conflicts with these constraints, update the documentation first or explicitly record an exception in an ADR before implementation proceeds.

## To Be Discovered
- Any future security requirements beyond static-site best practices.
- Any future compliance or accessibility targets that need to be treated as binding constraints.
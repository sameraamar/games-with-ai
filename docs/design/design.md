# Design Overview

## File Purpose
- What this file is: The top-level design entrypoint for the project.
- Why it exists: It keeps the overall product, architecture, requirements, constraints, and operational expectations recoverable from one place before readers drill into more detailed design material.
- How AI agents will use it: AI agents must read this file before implementation and use it to decide which additional design subdocuments are relevant.

## Maintenance Instructions
- When to update it: Update when the product direction, architecture, supported game inventory, documentation structure, or project-wide operating model changes.
- Who updates it: Humans and AI may update this file as long as it stays consistent with the current implementation and task ledger.
- How it relates to other docs: This is the top-level design overview. More detailed design files may exist under docs/design/ when a topic grows large enough to justify a separate document.

## Product Overview
Games With AI is a static browser-game collection designed for instant play and low-friction exploration. It serves both as a public portfolio of frontend and interaction work and as a compact set of self-contained games that can be launched directly in the browser.

## Audience Summary
- Portfolio visitors who want to assess product taste, polish, and engineering quality quickly.
- Casual web players who want immediate play without setup, accounts, or downloads.
- Game-specific learners using the Hebrew and Arabic educational game for lightweight practice.

## Product Goals
- Keep time-to-play short on supported devices.
- Preserve direct static routes to each game.
- Maintain a low-complexity static hosting model.
- Let games evolve independently without introducing unnecessary shared runtime infrastructure.
- Preserve enough documentation that future AI sessions can recover intent and continue work safely.

## Non-Goals
- No backend-driven platform behavior.
- No account system or server-side persistence.
- No requirement for cross-game progression.
- No forced framework adoption unless the documentation is deliberately revised.

## Current Project Scope
- Root landing page for collection discovery.
- Standalone game folders with direct browser entry points.
- Local persistence through browser storage where useful.
- Optional browser API enhancements such as Web Audio, Canvas, Speech Synthesis, Fullscreen, and Pointer Lock.

## Functional Expectations
- The landing page must explain the collection and route users into games.
- Each game must remain directly reachable through a static path.
- The path to first play must stay short and obvious.
- Local storage failures must not catastrophically break the experience.
- Game-specific constraints must remain visible when a game is desktop-first or browser-capability dependent.

## Architecture Overview
- Static multi-entry architecture.
- Browser-only execution.
- Per-game folder ownership.
- Progressive enhancement for optional browser APIs.
- Documentation-first workflow where code follows documented intent.

## Tech Stack Overview
- HTML, CSS, and vanilla JavaScript.
- DOM and Canvas rendering depending on the game.
- localStorage for local-only settings, progress, and best scores.
- Static hosting with GitHub Pages as the primary documented target.

## Constraints Overview
- Static hosting compatibility is a hard constraint.
- No accounts, backend services, or required cloud dependencies.
- Privacy is local-first by default.
- Mobile support is desirable where appropriate, but desktop-first games may remain desktop-first if that is clearly communicated.

## Testing and Validation Overview
- Route smoke checks matter for the landing page and each game route.
- A changed game should still reach a playable state.
- Mobile-friendly games should be checked in mobile-sized viewports.
- Desktop-first games should validate their keyboard or immersive-control flows.

## Deployment Overview
- The repository itself is the deployable artifact.
- Deployment remains file-based and static.
- Relative paths must keep working from the deployed root.
- Rollback should remain simple through source control because there is no server-side migration layer.

## Current Game Inventory
- Hebrew and Arabic educational game
- Neon Power Pong
- Gem Vault
- Iron Wolf 3D

## Detailed Design Notes
The repository currently also contains detailed design documents covering areas such as product vision, personas, requirements, architecture, tech stack, constraints, testing, and deployment. These exist as legacy detailed subdocuments from the earlier documentation scaffold.

Use them when you need more depth, but start here first.

## When To Split Further
Add more design subdocuments only when a domain becomes too large or naturally splits into smaller maintainable sub-domains. Good examples include user-profile, gameplay, admin, ui, auth, or per-game design folders.

## To Be Discovered
- Whether the detailed numbered design documents should later be reorganized into domain folders.
- Whether shared utilities or automation deserve stronger project-wide design treatment.
- How far the project should lean into mobile-first refinement for each individual game.
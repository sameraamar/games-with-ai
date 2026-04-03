# Architecture

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
- What this file is: The natural-language system architecture for the project.
- Why it exists: It explains how the project is organized so future changes preserve simplicity and static-hosting compatibility.
- How AI agents will use it: AI agents should consult this before restructuring files, introducing dependencies, or changing runtime assumptions.

## Maintenance Instructions
- When to update it: Update when folder structure, runtime boundaries, hosting assumptions, or shared architectural patterns change.
- Who updates it: AI should update this during implementation when the structure changes; humans should review any major architecture shift.
- How it relates to other docs: This file explains how the requirements are realized. ADRs record why major architecture decisions were made.

## Architectural Summary
The project uses a static multi-entry architecture. A root landing page introduces the collection, while each game is implemented as a mostly self-contained browser application in its own folder. There is no backend layer, no API dependency, and no centralized client application shell that all games must run through.

## Top-Level Structure
- Root index page: Acts as the collection hub and entry point for visitors.
- Game folders: Each game owns its own HTML and JavaScript entry points.
- Shared hosting model: All routes are served as static files from the repository root.
- Documentation layer: The docs folder defines intent, architecture, constraints, and operational guidance.

## Runtime Model
- Execution happens entirely in the browser.
- State lives in page memory and optional localStorage.
- Rendering is a mix of DOM-driven UI and Canvas-driven game logic depending on the game.
- Browser-native APIs provide optional enhancement for audio, speech, fullscreen, and input control.

## Architectural Patterns

### Pattern 1: Folder-Scoped Game Ownership
- Each game folder contains the files needed to run that game directly.
- Changes to one game should avoid side effects in unrelated games.

### Pattern 2: Static-First Delivery
- Pages are served as plain files.
- Routing is path-based rather than client-router based.
- Hosting must remain compatible with GitHub Pages or equivalent static hosts.

### Pattern 3: Progressive Enhancement
- Games may use advanced browser APIs when available.
- Core usability should degrade gracefully when optional APIs are missing.

### Pattern 4: Documentation as Source of Truth
- Product intent and expected behavior live in docs first.
- Code is an implementation of documented behavior, not the authoritative design artifact.

## Current Component View
- Landing page component:
  - Responsibilities: present the collection, explain the games, route visitors.
- Game page component:
  - Responsibilities: load game UI, manage state, handle controls, render feedback.
- Local persistence component:
  - Responsibilities: save per-game settings, progress, or best scores using browser storage.
- Browser capability integration component:
  - Responsibilities: use Speech Synthesis, Web Audio, Fullscreen, Pointer Lock, or Canvas when useful.

## Data Boundaries
- No shared server-side data exists.
- No cross-game account or profile object exists.
- Any persisted data is local to the browser and generally scoped by game-specific storage keys.

## Extension Strategy
- Add new games as additional standalone folders unless a documented reason exists to centralize logic.
- Prefer shared conventions over hard shared runtime dependencies.
- If common utilities emerge, document them explicitly before turning them into shared infrastructure.

## Risks and Tradeoffs
- Independent game folders reduce coupling but may lead to repeated patterns.
- Static architecture simplifies hosting but limits shared dynamic features.
- Browser API reliance improves richness but creates compatibility variance across devices.

## Architecture Rules
- Do not introduce backend assumptions without updating the design and ADR docs first.
- Do not collapse all games into one application shell unless a clear maintenance benefit is documented.
- Prefer direct, low-complexity implementations that preserve route independence.

## To Be Discovered
- Whether a small shared utility layer will become justified as the collection grows.
- Whether asset organization needs a documented cross-game convention beyond the current folder ownership model.
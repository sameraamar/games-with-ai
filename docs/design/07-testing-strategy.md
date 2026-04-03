# Testing Strategy

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
- What this file is: The documented testing approach for validating product behavior and preventing regressions.
- Why it exists: It provides a repeatable quality strategy for a multi-game static project with different input modes and browser capabilities.
- How AI agents will use it: AI agents should consult this before implementing features, proposing test coverage, or claiming work is complete.

## Maintenance Instructions
- When to update it: Update when the project adds new games, new environments, new browser dependencies, or new automation patterns.
- Who updates it: AI should update this when test strategy changes; humans should review changes that affect release confidence.
- How it relates to other docs: This file validates the requirements and constraints and should stay aligned with deployment expectations.

## Testing Goals
- Confirm each route loads successfully.
- Confirm each game can reach a playable state.
- Catch regressions in navigation, layout, controls, and local persistence.
- Verify browser feature fallback behavior where APIs are optional.

## Test Layers

### Layer 1: Route and Smoke Checks
- Verify the root landing page loads.
- Verify each game route loads directly.
- Verify core UI elements needed to begin play are present.

### Layer 2: Interaction Validation
- Validate primary start flows for each game.
- Validate key control modes where applicable, including keyboard, click/tap, and mobile navigation controls.
- Validate that desktop-first games communicate their expectations clearly.

### Layer 3: State and Persistence Checks
- Verify settings and best-score or progress behavior persist through reload where designed.
- Verify corrupted or absent local storage does not break the page irrecoverably.

### Layer 4: Layout and Responsiveness Checks
- Verify the landing page remains legible on common desktop and mobile widths.
- Verify mobile-friendly games remain usable in touch-oriented viewports.
- Verify desktop-first games do not silently fail on unsupported contexts.

### Layer 5: Browser Capability Checks
- Verify behavior when Speech Synthesis is unavailable.
- Verify behavior when AudioContext is blocked until user interaction.
- Verify graceful handling of Fullscreen or Pointer Lock denial.

## Minimum Regression Checklist
- Root landing page still routes correctly.
- Direct links to all games still work.
- No console-blocking runtime error on initial load of changed pages.
- Existing local storage keys still behave compatibly unless a migration is documented.
- Changed game still reaches a playable state.

## Recommended Manual Coverage Matrix
- Desktop Chromium-based browser
- Desktop Firefox or equivalent secondary browser when practical
- Mobile-width Chromium emulation for touch-friendly games
- Real desktop keyboard flow for desktop-first games

## Automation Guidance
- Use lightweight browser automation only where it meaningfully reduces regression risk.
- Prefer route smoke tests, visual checks, and focused interaction scripts over brittle end-to-end overengineering.
- If automated checks are added, document which routes and states they cover.

## Completion Rule
- A task is not complete until relevant validation has been performed and tasks.md is updated with the outcome.

## To Be Discovered
- Which smoke checks should become automated by default.
- Whether visual regression checks are worth maintaining for the landing page and each game.
# Tech Stack

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
- What this file is: The documented technology choices and conventions for the project.
- Why it exists: It prevents accidental drift into unnecessary complexity and clarifies the preferred tools for future work.
- How AI agents will use it: AI agents should use this file to decide what technologies to prefer, avoid, or justify before adding dependencies.

## Maintenance Instructions
- When to update it: Update when tooling, runtime assumptions, browser API usage, or deployment tooling changes.
- Who updates it: AI should update this when the implementation stack changes; humans should approve major stack changes.
- How it relates to other docs: This file supports architecture and constraints by documenting the chosen implementation means.

## Current Preferred Stack
- Markup: HTML
- Styling: CSS
- Client logic: Vanilla JavaScript
- Rendering: DOM and Canvas depending on the game
- Storage: Browser localStorage
- Audio and interaction enhancements: Web Audio, Fullscreen API, Pointer Lock API, Speech Synthesis API where appropriate
- Hosting: Static hosting, with GitHub Pages as the primary documented target

## Supporting Tooling
- Local development server: Any simple static file server
- Optional UI verification: Playwright or equivalent screenshot-based browser checks when useful
- Version control: Git
- Documentation format: Markdown only

## Technology Selection Principles
- Prefer browser-native capabilities over framework adoption.
- Prefer no build step unless a strong maintenance or capability benefit is documented.
- Prefer minimal dependencies.
- Prefer technologies that keep the repo easy to host and easy to understand.

## Approved Uses of Browser APIs
- Canvas for visual gameplay and rendering loops.
- localStorage for local-only settings, progress, and scores.
- Speech Synthesis for educational pronunciation support when available.
- Web Audio for sound and music effects.
- Fullscreen and Pointer Lock for immersive desktop-first experiences where relevant.

## Discouraged Additions Without Documentation Update
- Backend frameworks or cloud runtimes.
- Client frameworks introduced only for stylistic preference.
- Complex build pipelines for isolated changes.
- Global state systems spanning all games.

## Dependency Policy
- New dependencies require a clear problem statement and justification.
- A dependency is acceptable only if it reduces net complexity or enables a capability that browser-native code would implement poorly.
- If a dependency is added, document why native code was insufficient.

## Future Stack Evolution Criteria
- A build step is acceptable if multiple games begin sharing substantial tooling or assets.
- Shared utility modules are acceptable if duplication becomes costly and the abstraction remains simple.
- Any shift toward backend features requires updates to the constraints, architecture, deployment, and ADR docs first.

## To Be Discovered
- Whether any formal package management or linting standard should be adopted repo-wide.
- Whether screenshot or browser automation tooling should become a first-class documented dependency.
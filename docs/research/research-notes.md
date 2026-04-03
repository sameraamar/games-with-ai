# Research Notes

## File Purpose
- What this file is: A lightweight place to capture observations, open questions, and repo-derived findings that inform planning.
- Why it exists: It preserves context that is useful for future sessions but does not belong in core design docs or ADRs.
- How AI agents will use it: AI agents should read this for current repository evidence and append concise findings when research clarifies product or technical decisions.

## Maintenance Instructions
- When to update it: Update after repo analysis, user interviews, technical spikes, or comparative research.
- Who updates it: AI can append findings; humans can add business or product research notes.
- How it relates to other docs: Core decisions should be promoted into design docs or ADRs once they become stable.

## Current Repository Findings
- The repository is already structured as a static collection of browser games.
- The root landing page positions the project as a collection of instantly playable browser games.
- README explicitly states there is no backend requirement.
- GitHub Pages is already documented as the primary publishing method.

## Current Game Inventory
- Hebrew and Arabic educational game
- Neon Power Pong
- Gem Vault
- Iron Wolf 3D

## Observed Technical Patterns
- Per-game folder ownership is already established.
- Vanilla HTML, CSS, and JavaScript are the dominant implementation style.
- Browser APIs are used selectively for richer interaction.
- localStorage is used for settings, progress, and score persistence.

## Audience and Product Notes
- Confirmed primary audiences are portfolio visitors and casual web players.
- Educational language play is present but does not define the whole collection.
- The project is better framed as a public portfolio and instant-play collection than as a commercial platform.

## Open Questions
- Should future additions prioritize more arcade games, more educational games, or an even mix?
- Should a shared visual system emerge across all games, or should each game keep stronger autonomy?
- Is zero-telemetry a permanent requirement or just the current default?

## Placeholder Policy
- If important information is still unknown, mark it as To Be Discovered in the relevant design doc instead of delaying documentation.
- Initialization should not block on missing business or technical detail.

## Research Follow-Ups
- Review whether a small shared utility layer would reduce duplication without harming independence.
- Review whether automated route smoke tests are worth formalizing for all game pages.
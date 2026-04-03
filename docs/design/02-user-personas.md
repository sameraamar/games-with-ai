# User Personas

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
- What this file is: A description of the primary audiences the project is designed for.
- Why it exists: It keeps feature decisions aligned with real user motivations instead of implementation convenience.
- How AI agents will use it: AI agents should use these personas to judge tradeoffs in UX, content hierarchy, performance, and feature prioritization.

## Maintenance Instructions
- When to update it: Update when the target audience changes, a new major user segment appears, or priorities shift between portfolio and player value.
- Who updates it: Human owners should confirm audience strategy; AI may refine wording when product evidence changes.
- How it relates to other docs: Personas justify the requirements, UX priorities, constraints, and test scenarios described elsewhere.

## Primary Persona 1: Portfolio Visitor
- Summary: A visitor arriving at the public site to assess the creator's design taste, frontend engineering skill, and experimentation quality.
- Goals:
  - Understand the project quickly.
  - Sample multiple games with minimal effort.
  - See polish, variety, and technical competence.
- Frustrations:
  - Slow loading or confusing navigation.
  - Broken routes or inconsistent quality between games.
  - A repo or site that feels unfinished or undocumented.
- Success criteria:
  - The landing page clearly communicates the collection.
  - Each game feels intentionally built, not boilerplate.
  - The project demonstrates breadth without operational complexity.

## Primary Persona 2: Casual Web Player
- Summary: A player who wants instant browser play without setup, installation, or account creation.
- Goals:
  - Start a game immediately.
  - Learn controls quickly.
  - Enjoy short play sessions on common devices.
- Frustrations:
  - Long onboarding or mandatory configuration.
  - Browser incompatibilities.
  - Overly complex mechanics for casual use.
- Success criteria:
  - Clear calls to action from the landing page.
  - Fast load times and obvious controls.
  - Stable behavior on supported desktop and mobile contexts.

## Secondary Persona: Game-Specific Learner
- Summary: A user drawn specifically to the Hebrew and Arabic learning game rather than the broader collection.
- Goals:
  - Practice letters, words, numbers, and memory activities.
  - Use a friendly UI on desktop or mobile.
  - Retain progress locally without needing an account.
- Frustrations:
  - Unclear educational flow.
  - Missing browser support for speech or interaction feedback.
  - Progress loss or confusing state recovery.
- Success criteria:
  - Educational interactions are obvious and repeatable.
  - Feature fallback is acceptable when speech support is unavailable.
  - The game remains easy to reopen and resume locally.

## Persona Priority Rules
- When tradeoffs arise between visual expressiveness and instant comprehension, optimize first for the portfolio visitor understanding the project quickly.
- When tradeoffs arise between advanced mechanics and accessibility of play, optimize first for the casual web player starting quickly.
- Educational enhancements should not impose backend or account complexity across the whole project.

## Design Implications
- The landing page must explain the collection at a glance.
- Each game should expose its value and controls early.
- Game routes must remain direct and shareable.
- Static hosting compatibility matters because frictionless access is central to both primary personas.

## To Be Discovered
- Whether additional personas are needed for repeat players, educators, or collaborators.
- Whether future audience prioritization should change as new games are added.
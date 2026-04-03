# Deployment

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
- What this file is: The deployment strategy and release guidance for the project.
- Why it exists: It keeps the shipping process aligned with the project's static-first architecture and low-operations goals.
- How AI agents will use it: AI agents should read this before proposing build, release, or infrastructure changes and should preserve the deployment assumptions unless documentation changes first.

## Maintenance Instructions
- When to update it: Update when hosting platform, route assumptions, release checks, or deployment steps change.
- Who updates it: AI may update procedural details as deployment evolves; humans should approve platform changes.
- How it relates to other docs: This file depends on the architecture, constraints, and testing strategy and should remain consistent with them.

## Deployment Model
- Primary model: Static site deployment.
- Current preferred target: GitHub Pages.
- Alternative acceptable targets: Any static host that preserves folder-based routes.

## Release Artifact
- The repository itself is the deployable artifact.
- No server bundle, database migration, or environment secret is required for the current product scope.

## Deployment Requirements
- The root index page must remain present for collection discovery.
- Each game folder must preserve its direct entry route.
- Relative asset links must continue to work from the deployed root.

## Pre-Deployment Checklist
- Confirm changed routes still load locally.
- Confirm direct links to affected games still work.
- Confirm no documented constraints were violated.
- Confirm tasks.md and relevant design docs were updated.
- Confirm any desktop-only or mobile-specific behavior remains accurate in documentation and UI copy.

## GitHub Pages Guidance
- Deploy from the repository root.
- Keep route paths static and file-based.
- Avoid deployment assumptions that require rewrites, server middleware, or dynamic API endpoints.

## Rollback Strategy
- Revert to the last known good commit.
- Because the app is static, rollback should restore the previous site state without data migration concerns.
- Local browser state may persist across rollbacks, so storage schema changes should remain backward compatible when possible.

## Future Deployment Triggers for Re-Architecture Review
- Introduction of user accounts
- Need for shared server-side persistence
- Need for analytics or telemetry pipelines
- Need for multiplayer or content management APIs

If any of these occur, update the architecture, constraints, and ADR docs before implementation begins.

## To Be Discovered
- Whether additional static hosting targets should be officially supported.
- Whether a formal release checklist or release note template is needed beyond the current workflow.
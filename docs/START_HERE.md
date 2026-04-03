# Start Here

## File Purpose
- What this file is: The project entrypoint for humans and AI agents starting work in this repository.
- Why it exists: It provides the minimum orientation needed to recover project intent, current phase, and the required documentation workflow without relying on chat history.
- How AI agents will use it: AI agents must read this first, then read tasks.md, then read docs/design/design.md, and only then open any relevant detailed design subdocuments.

## Maintenance Instructions
- When to update it: Update when the project summary, current phase, source-of-truth files, or startup workflow changes.
- Who updates it: Humans and AI may update this file whenever project workflow or documentation structure changes.
- How it relates to other docs: This file points to the authoritative task ledger and the top-level design entrypoint. It does not replace detailed design or task tracking.

## Project Summary
Games With AI is a static collection of browser-based games intended for instant play, direct linking, and lightweight hosting. The repository currently includes a landing page plus standalone game folders for educational play, arcade play, memory-and-luck play, and desktop-first action play.

## Current Phase
- Primary phase: Baseline quality and documentation alignment.
- Current emphasis: Keep documentation recoverable for future AI sessions while validating routes, game behavior, and sustainable maintenance workflow.

## Source of Truth
- Task planning and progress: docs/tasks.md
- Top-level product and technical design: docs/design/design.md
- Detailed design subdocuments, when present: only the relevant files under docs/design/
- Architectural decisions: docs/decisions/

## Restarting AI Sessions
1. Read docs/START_HERE.md.
2. Read docs/tasks.md.
3. Read docs/design/design.md.
4. Read only the relevant detailed design subdocuments if they exist.
5. Summarize the current project intent, active phase, and the specific task scope before proposing changes.

## Starting New Tasks
1. Confirm the task already exists in docs/tasks.md or add it before implementation.
2. Read the design docs relevant to the task.
3. Make the smallest reviewable change that satisfies the task.
4. After implementation, update docs/tasks.md and any relevant design documents.

## Task Kickoff Script
Read docs/START_HERE.md, then docs/tasks.md, then docs/design/design.md, then the relevant design subdocuments if they exist.

Summarize the current project intent and phase.

Ask clarifying questions only if required.

Then propose a minimal, reviewable implementation plan.
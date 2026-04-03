# Tasks

## File Purpose
- What this file is: The authoritative task ledger for planned, active, completed, and newly discovered work.
- Why it exists: It keeps implementation work traceable, phase-based, and recoverable across fresh human or AI sessions.
- How AI agents will use it: AI agents must read docs/START_HERE.md first, then this file, then docs/design/design.md, and only then any relevant detailed design subdocuments before implementation.

## Maintenance Instructions
- When to update it: Update before starting meaningful work, after completing work, when task status changes, and when new work is discovered.
- Who updates it: Both humans and AI update this file. AI must not treat it as optional.
- How it relates to other docs: Tasks should reference the design docs as the behavioral source of truth. If implementation changes intent, update the design docs together with this file.

## AI Operating Instructions
- Always read docs/START_HERE.md before implementation.
- Always read this file before implementation.
- Always read docs/design/design.md before implementation.
- Read only the relevant detailed design subdocuments when needed.
- Never mark a task complete unless the related work and validation are actually done.
- After any work, update this file and the relevant design docs.
- Add newly discovered work to the discovered tasks section instead of hiding it in prose.

## Mandatory Workflow

### Before ANY implementation work
- Read docs/START_HERE.md.
- Read tasks.md.
- Read docs/design/design.md.
- Read only the relevant detailed design subdocuments if needed.
- Confirm the specific task or create one if the work is new.

### After completing ANY work
- Update tasks.md.
- Update docs/design/design.md when project-level design changed.
- Update the relevant detailed design docs when needed.
- Record validation outcome.
- Add any newly discovered follow-up work.

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Complete

## Phase 1: Documentation Foundation

### 1.1 Establish AI-first project docs
- Status: [x]
- Acceptance criteria:
  - docs/design, docs/research, docs/decisions, .github/copilot, and templates exist.
  - Each required Markdown file exists and begins with file-purpose and maintenance guidance.
  - The docs reflect the current static browser-games repository accurately.
- Dependencies: None

#### 1.1.1 Write product vision
- Status: [x]
- Acceptance criteria:
  - Product goals, non-goals, and experience principles are documented.
- Dependencies: None

#### 1.1.2 Write personas
- Status: [x]
- Acceptance criteria:
  - Primary personas include portfolio visitors and casual web players.
- Dependencies: 1.1.1

#### 1.1.3 Write requirements and architecture
- Status: [x]
- Acceptance criteria:
  - Functional and non-functional requirements are documented.
  - Static multi-entry architecture is documented.
- Dependencies: 1.1.1, 1.1.2

#### 1.1.4 Write constraints, testing, and deployment docs
- Status: [x]
- Acceptance criteria:
  - Static hosting, privacy, performance, and support constraints are documented.
  - Validation and deployment workflows are documented.
- Dependencies: 1.1.3

#### 1.1.5 Create initial ADR and workflow templates
- Status: [x]
- Acceptance criteria:
  TBD
- Dependencies: 
  TBD


### 1.2 Add living-document placeholder coverage
- Status: [x]
- Acceptance criteria:
  - Each design document explicitly states that incomplete and placeholder sections are expected.
  - Unknown areas are marked as To Be Discovered rather than blocking initialization.
- Dependencies: 1.1

## Phase 2: Baseline Quality and Navigation

### 2.1 Validate collection routes and entry points
- Status: [ ]
- Acceptance criteria:
  - Root landing page and all documented game routes load successfully.
  - Broken links and obvious route issues are fixed.
- Dependencies: 1.1

#### 2.1.1 Verify root landing page copy and CTAs
- Status: [ ]
- Acceptance criteria:
  - The landing page clearly explains the collection and primary actions.
- Dependencies: 2.1

#### 2.1.2 Verify each game route from README and landing page
- Status: [ ]
- Acceptance criteria:
  - All documented routes are reachable directly and from the landing page.
- Dependencies: 2.1

### 2.2 Establish minimal regression validation workflow
- Status: [ ]
- Acceptance criteria:
  - A repeatable smoke-check process is documented or scripted.
  - Changed routes can be validated consistently after edits.
- Dependencies: 1.1

## Phase 3: Game-by-Game Maintenance

### 3.1 Hebrew and Arabic game review
- Status: [ ]
- Acceptance criteria:
  - Educational flow, local persistence, and speech fallback behavior are documented and reviewed.
- Dependencies: 1.1

### 3.2 Pong review
- Status: [ ]
- Acceptance criteria:
  - Desktop and mobile mode expectations are documented and reviewed.
- Dependencies: 1.1

### 3.3 Gem Vault review
- Status: [ ]
- Acceptance criteria:
  - Solo and local pass-and-play behavior are documented and reviewed.
- Dependencies: 1.1

### 3.4 Iron Wolf 3D review
- Status: [ ]
- Acceptance criteria:
  - Desktop-first constraints and control expectations are documented and reviewed.
- Dependencies: 1.1

## Phase 4: Sustainable Improvement

### 4.1 Evaluate opportunities for low-risk shared utilities
- Status: [ ]
- Acceptance criteria:
  - Any proposed shared utility reduces duplication without harming independent game ownership.
- Dependencies: 2.2, 3.1, 3.2, 3.3, 3.4

### 4.2 Evaluate lightweight automation coverage
- Status: [ ]
- Acceptance criteria:
  - A documented decision exists on whether route smoke tests or visual checks should be automated.
- Dependencies: 2.2

## Discovered Tasks
- [ ] Add task entries here when work is discovered during implementation.
- [ ] Reference the related phase or create a new phase if the work changes project scope.

## Work Log Notes
- ...

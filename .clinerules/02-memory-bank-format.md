# Memory Bank Update Format

## progress.md — Entry Format
Add new entries at the TOP of the file, before existing entries:

```markdown
## [YYYY-MM-DD] — Task/Feature Name
- Changed: [What was done — specific files, features, configs]
- Reason: [Why it was changed — user request, bug fix, improvement]
- Impact: [What it affects — functionality, performance, other systems]
```

## activeContext.md — Sections to Update

### Recent Changes
Add a bullet point describing what changed in this session.

### Current Focus
Update if the project focus has shifted.

### Next Steps
Update the TODO list — mark completed items, add new ones.

### Active Decisions
Add any new architectural or design decisions made during the task.

## When to Update Other Files
- `techContext.md` — when tech stack, dependencies, or build config changes
- `systemPatterns.md` — when architecture or design patterns change
- `productContext.md` — when project goals or user experience goals change
- `projectbrief.md` — when core requirements or scope changes

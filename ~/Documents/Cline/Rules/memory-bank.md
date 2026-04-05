# Memory Bank Protocol

## Core Principle
Memory Bank is the single source of truth for project context.
A task is NOT complete until Memory Bank is updated.

## Enforcement
- NEVER call attempt_completion without updating Memory Bank first
- If Memory Bank is not updated, the task has FAILED
- This applies to ALL tasks: push, commit, file edits, code changes, questions
- BEFORE attempt_completion: update progress.md, THEN call attempt_completion

## Startup Protocol
At the start of EVERY session:
1. Check if `memory-bank/` directory exists
2. If yes, read all files in order:
   - `projectbrief.md` — goals, requirements
   - `productContext.md` — why project exists
   - `activeContext.md` — current focus, recent changes
   - `systemPatterns.md` — architecture, patterns
   - `techContext.md` — tech stack, constraints
   - `progress.md` — what works, what's left
3. Understand current state before proceeding

## Completion Protocol
After EVERY task:
1. Update `progress.md` — add entry at top:
   ```
   ## [Date] — [Task Name]
   - Changed: [what was done]
   - Reason: [why it was changed]
   - Impact: [what it affects]
   ```
2. Update `activeContext.md` — current focus, recent changes, next steps
3. Verify Memory Bank reflects actual project state

## File Purposes
| File | Update Frequency |
|------|------------------|
| projectbrief.md | Only for major scope changes |
| productContext.md | Rarely, when product direction changes |
| activeContext.md | After every task |
| systemPatterns.md | When architecture changes |
| techContext.md | When tech stack changes |
| progress.md | After every task |
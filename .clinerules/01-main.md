# Cline Agent Rules — English_Teacher (VOT)

## Startup Protocol

At the beginning of EVERY session or task, follow this workflow:

### Step 1: Read Memory Bank
Read all files in `memory-bank/` to understand the project context:

1. `memory-bank/projectbrief.md` — Project goals and core requirements
2. `memory-bank/productContext.md` — Why the project exists, problems it solves
3. `memory-bank/activeContext.md` — Current focus, recent changes, next steps
4. `memory-bank/systemPatterns.md` — Architecture, design patterns
5. `memory-bank/techContext.md` — Tech stack, setup, constraints
6. `memory-bank/progress.md` — What works, what's left, known issues

### Step 2: Understand Context
- What is the current state of the project?
- What was the last task?
- What files/systems are affected?

### Step 3: Proceed with Task
Use the full project context to plan and execute changes.

---

## Completion Protocol

### CRITICAL RULE (MUST DO FIRST)
BEFORE calling attempt_completion, you MUST:
1. Update `memory-bank/progress.md` — add entry at top
2. Update `memory-bank/activeContext.md` if context changed
3. THEN call attempt_completion

**Skipping Memory Bank update = FAILED task. Do not skip.**

---

### Required Updates
- `memory-bank/progress.md` — Document what was done (add entry at top with date and description)
- `memory-bank/activeContext.md` — Update if context changed (current focus, recent changes, next steps)

### Update Format for progress.md
```markdown
## [Date] — [Task/Feature Name]
- Changed: [What was done]
- Reason: [Why it was changed]
- Impact: [What it affects]
```

### Checklist
- [ ] Update progress.md with current task
- [ ] Review activeContext.md and update if needed
- [ ] Write a clear summary of what changed and why
- [ ] Verify Memory Bank reflects the actual project state

> **A task is NOT complete until Memory Bank is updated.**

---

## Workflow Cycle

[Read Memory Bank] → [Plan Task] → [Execute] → [Update Memory Bank] → [Summary]
       ↑                                                      |
       └──────────────────────────────────────────────────────┘

---

## Project Context

- **Project:** English_Teacher (VOT) — Voice-over Translation extension
- **Version:** 1.13.1
- **Tech:** TypeScript, Vite, lit-html, Biome
- **Status:** Stable, active development not currently ongoing
- **Repository:** https://github.com/bashtovoy/English_Teacher.git
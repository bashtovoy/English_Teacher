# Agent Workflow Instructions

## Memory Bank Commands

The following commands are used to manage context across sessions:

| Command | Description |
|---------|-------------|
| `"follow your custom instructions"` | Tells Cline to read Memory Bank and continue where you left off |
| `"initialize memory bank"` | Creates the initial structure for a new project |
| `"update memory bank"` | Triggers a full documentation review and update |

These work alongside Cline's built-in slash commands (`/newtask` and `/smol`).

## Startup Protocol: Follow Your Custom Instructions

At the beginning of EVERY message/task, the agent MUST:

1. **Read Memory Bank files** in this order:
   - `memory-bank/projectbrief.md` — Foundation document with core requirements and goals
   - `memory-bank/productContext.md` — Why the project exists, problems it solves
   - `memory-bank/activeContext.md` — Current focus, recent changes, next steps
   - `memory-bank/systemPatterns.md` — Architecture, design patterns
   - `memory-bank/techContext.md` — Tech stack, setup, constraints
   - `memory-bank/progress.md` — What works, what's left, known issues

2. **Understand current context** — what was the last task, what state is the project in

3. **Proceed with the task** using the full project context

## Completion Protocol: Update Memory Bank

After completing ANY task, the agent MUST:

### 1. Update Memory Bank
- `progress.md` — document what was done
- `activeContext.md` — update if context changed (current focus, recent changes, next steps)

### 2. Write a Clear Summary
- What changed
- Why it changed

### 3. Verify Consistency
- Ensure Memory Bank reflects the actual project state

> **A task is NOT complete until Memory Bank is updated.**

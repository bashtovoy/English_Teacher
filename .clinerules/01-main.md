# Cline Agent Rules — English_Teacher (VOT)

## Memory Bank Protocol

### On Task Start
Read all files in `memory-bank/` to understand the project context:
1. `memory-bank/projectbrief.md` — Project goals and core requirements
2. `memory-bank/productContext.md` — Why the project exists, problems it solves
3. `memory-bank/activeContext.md` — Current focus, recent changes, next steps
4. `memory-bank/systemPatterns.md` — Architecture, design patterns
5. `memory-bank/techContext.md` — Tech stack, setup, constraints
6. `memory-bank/progress.md` — What works, what's left, known issues

### Before Task Completion (CRITICAL)
**BEFORE calling attempt_completion, you MUST:**
1. Update `memory-bank/progress.md` — add entry at TOP with date and description
2. Update `memory-bank/activeContext.md` — update Recent Changes, Current Focus, Next Steps
3. THEN call attempt_completion

> **Skipping Memory Bank update = BLOCKED by TaskComplete hook. The task will NOT complete.**

## Project Context
- **Project:** English_Teacher (VOT) — Voice-over Translation extension
- **Version:** 1.13.1
- **Tech:** TypeScript, Vite, lit-html, Biome
- **Status:** Stable, active development not currently ongoing
- **Repository:** https://github.com/bashtovoy/English_Teacher.git
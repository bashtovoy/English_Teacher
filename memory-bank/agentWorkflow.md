# Agent Workflow Instructions

## Write-back Enforcement

After completing ANY task, the agent MUST:

### 1. Update Memory Bank
- `progress.md` — document what was done
- `activeContext.md` — update if context changed

### 2. Write a Clear Summary
- What changed
- Why it changed

### 3. Verify Consistency
- Ensure Memory Bank reflects the actual project state

> **A task is NOT complete until Memory Bank is updated.**
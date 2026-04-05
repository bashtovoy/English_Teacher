# Memory Bank Enforcement Rules

## CRITICAL: Before Task Completion

**These rules MUST be followed before calling attempt_completion:**

### Required File Updates

1. **memory-bank/progress.md** — Always update with task entry
   - Add new entry at the top with format: `## [Date] — Task Name`
   - Include: Changed, Reason, Impact sections

2. **memory-bank/activeContext.md** — Update if context changed
   - Add to Recent Changes section
   - Update Current Focus if needed
   - Update Next Steps

### Verification Checklist

Before completing any task, verify:
- [ ] progress.md has been updated with current task
- [ ] activeContext.md reflects recent changes
- [ ] All modified files are saved

### Consequences

**Skipping Memory Bank update = FAILED TASK**

If you catch yourself about to call attempt_completion without updating Memory Bank:
1. STOP
2. Update the files first
3. THEN call attempt_completion

---

## Hook Integration (Future)

When Cline supports hooks, use `TaskComplete` hook to:
- Automatically verify Memory Bank files were updated
- Block completion if updates are missing
- Add automatic timestamp entries
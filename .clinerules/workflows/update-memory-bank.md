# Update Memory Bank

Review and update all Memory Bank files to reflect the current project state. This workflow ensures that the agent correctly evaluates changes, formulates a plan, and carefully commits updates to the Memory Bank.

## Step 1: Analyze Uncommitted and Recent Changes
Check the current state of the workspace and recent commits to understand what work was recently done.

<execute_command>
<command>git status</command>
<requires_approval>false</requires_approval>
</execute_command>

<execute_command>
<command>git log --oneline -n 5</command>
<requires_approval>false</requires_approval>
</execute_command>

If `git status` shows uncommitted changes, use `git diff` to review them so you understand exactly what was modified in the current session.

## Step 2: Read Current Memory Bank State
Read the core Memory Bank files to understand what is currently documented. Pay special attention to:
- `memory-bank/activeContext.md` (Current Focus, Recent Changes)
- `memory-bank/progress.md` (Recent tasks completed)
- `memory-bank/techContext.md` (If any dependencies or config changed)
- `memory-bank/systemPatterns.md` (If architecture was modified)

## Step 3: Formulate Update Plan
Based on the Git changes (Step 1) and current Memory Bank (Step 2), formulate a brief plan of what needs to be updated.
For example:
- Adding a new task entry to `progress.md`
- Updating "Recent Changes" in `activeContext.md`

<ask_followup_question>
<question>I am ready to update the Memory Bank based on recent changes. Here is my summary of what needs to be updated. Should I proceed?</question>
<options>["Proceed", "Cancel", "Modify Plan"]</options>
</ask_followup_question>

## Step 4: Apply Updates
Modify the Memory Bank files according to the approved plan. 
**CRITICAL:** Ensure that all modifications adhere to the format specified in `.clinerules/02-memory-bank-format.md`.
- `progress.md` entries MUST be added at the TOP of the list.
- Do not lose existing context, only append or modify relevant sections.

## Step 5: Verification
Verify that your changes have been successfully applied. Provide a final summary of exactly which files and sections were modified.

#!/bin/bash
# TaskComplete Hook — Automatically verifies Memory Bank was updated before task completion
# This hook runs when a task finishes successfully

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Paths
PROGRESS_FILE="memory-bank/progress.md"
ACTIVE_CONTEXT_FILE="memory-bank/activeContext.md"

echo -e "${YELLOW}[Memory Bank Hook]${NC} Checking if Memory Bank files exist..."

# Check if progress.md exists
if [ ! -f "$PROGRESS_FILE" ]; then
    echo -e "${RED}ERROR: ${PROGRESS_FILE} not found!${NC}"
    echo "Memory Bank is incomplete. Task cannot be marked as complete."
    exit 1
fi

# Check if activeContext.md exists
if [ ! -f "$ACTIVE_CONTEXT_FILE" ]; then
    echo -e "${RED}ERROR: ${ACTIVE_CONTEXT_FILE} not found!${NC}"
    echo "Memory Bank is incomplete. Task cannot be marked as complete."
    exit 1
fi

echo -e "${GREEN}✓${NC} Memory Bank files exist"

# Check if progress.md has recent entry (last line should contain a date header ## or entry)
RECENT_ENTRY=$(grep -c "^## \[" "$PROGRESS_FILE" || true)

if [ "$RECENT_ENTRY" -eq 0 ]; then
    echo -e "${RED}ERROR: ${PROGRESS_FILE} has no task entries!${NC}"
    echo "Each task must add an entry to progress.md"
    exit 1
fi

echo -e "${GREEN}✓${NC} progress.md has ${RECENT_ENTRY} task entries"

# Check if activeContext.md contains ## Recent Changes section
if ! grep -q "## Recent Changes" "$ACTIVE_CONTEXT_FILE"; then
    echo -e "${YELLOW}WARNING: ${ACTIVE_CONTEXT_FILE} may be missing Recent Changes section${NC}"
    echo "Consider adding recent changes to activeContext.md"
fi

echo -e "${GREEN}[Memory Bank Hook]${NC} All checks passed!"
echo "Memory Bank is up to date. Task can be completed."

exit 0
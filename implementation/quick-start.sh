#!/bin/bash

# Recurring Todos Feature - Quick Integration Script
# This script helps copy files to your todo app project
# 
# Usage: ./quick-start.sh /path/to/your/todo-app

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if target directory is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide target directory${NC}"
    echo "Usage: ./quick-start.sh /path/to/your/todo-app"
    exit 1
fi

TARGET_DIR="$1"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo -e "${RED}Error: Directory $TARGET_DIR does not exist${NC}"
    exit 1
fi

echo -e "${GREEN}🚀 Recurring Todos Feature - Quick Integration${NC}"
echo -e "${YELLOW}Target directory: $TARGET_DIR${NC}"
echo ""

# Confirm before proceeding
read -p "This will copy files to $TARGET_DIR. Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo -e "${GREEN}📁 Creating directories...${NC}"

# Create necessary directories
mkdir -p "$TARGET_DIR/lib"
mkdir -p "$TARGET_DIR/app/api/todos"
mkdir -p "$TARGET_DIR/components/recurring"
mkdir -p "$TARGET_DIR/tests"

echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Copy lib files
echo -e "${GREEN}📋 Copying library files...${NC}"

if [ -f "lib/types.ts" ]; then
    cp "lib/types.ts" "$TARGET_DIR/lib/types-recurring.ts"
    echo "  ✓ lib/types.ts → lib/types-recurring.ts"
    echo "    ${YELLOW}Note: Merge this with your existing lib/db.ts${NC}"
fi

if [ -f "lib/migrations.ts" ]; then
    cp "lib/migrations.ts" "$TARGET_DIR/lib/migrations-recurring.ts"
    echo "  ✓ lib/migrations.ts → lib/migrations-recurring.ts"
fi

if [ -f "lib/recurrence-utils.ts" ]; then
    cp "lib/recurrence-utils.ts" "$TARGET_DIR/lib/recurrence-utils.ts"
    echo "  ✓ lib/recurrence-utils.ts → lib/recurrence-utils.ts"
    echo "    ${YELLOW}Note: You may want to merge functions into lib/timezone.ts${NC}"
fi

echo ""

# Copy API route
echo -e "${GREEN}🔌 Copying API route...${NC}"

if [ -f "app/api/todos/[id]/route.ts" ]; then
    cp "app/api/todos/[id]/route.ts" "$TARGET_DIR/app/api/todos/[id]/route-recurring.ts.backup"
    echo "  ✓ app/api/todos/[id]/route.ts → app/api/todos/[id]/route-recurring.ts.backup"
    echo "    ${YELLOW}Note: This is a backup. Merge with your existing route.ts${NC}"
fi

echo ""

# Copy components
echo -e "${GREEN}🎨 Copying UI components...${NC}"

if [ -f "components/RecurrenceSelector.tsx" ]; then
    cp "components/RecurrenceSelector.tsx" "$TARGET_DIR/components/recurring/"
    echo "  ✓ RecurrenceSelector.tsx → components/recurring/"
fi

if [ -f "components/RecurrenceIndicator.tsx" ]; then
    cp "components/RecurrenceIndicator.tsx" "$TARGET_DIR/components/recurring/"
    echo "  ✓ RecurrenceIndicator.tsx → components/recurring/"
fi

if [ -f "components/TodoItem.tsx" ]; then
    cp "components/TodoItem.tsx" "$TARGET_DIR/components/recurring/TodoItem.example.tsx"
    echo "  ✓ TodoItem.tsx → components/recurring/TodoItem.example.tsx"
    echo "    ${YELLOW}Note: This is an example. Adapt to your todo list component${NC}"
fi

echo ""

# Copy tests
echo -e "${GREEN}🧪 Copying test file...${NC}"

if [ -f "tests/03-recurring-todos.spec.ts" ]; then
    cp "tests/03-recurring-todos.spec.ts" "$TARGET_DIR/tests/"
    echo "  ✓ 03-recurring-todos.spec.ts → tests/"
    echo "    ${YELLOW}Note: Adapt helper methods to match your test setup${NC}"
fi

echo ""

# Copy documentation
echo -e "${GREEN}📚 Copying documentation...${NC}"

cp "README.md" "$TARGET_DIR/docs/RECURRING_TODOS_README.md" 2>/dev/null || echo "  ${YELLOW}Skipped: docs directory not found${NC}"
cp "IMPLEMENTATION_GUIDE.md" "$TARGET_DIR/docs/RECURRING_TODOS_GUIDE.md" 2>/dev/null || echo "  ${YELLOW}Skipped: docs directory not found${NC}"

if [ -f "$TARGET_DIR/docs/RECURRING_TODOS_README.md" ]; then
    echo "  ✓ Documentation copied to docs/"
fi

echo ""
echo -e "${GREEN}✅ Files copied successfully!${NC}"
echo ""

# Next steps
echo -e "${GREEN}📋 Next Steps:${NC}"
echo ""
echo "1. ${YELLOW}Database Migration:${NC}"
echo "   - Run the migration in lib/migrations-recurring.ts"
echo "   - Verify: sqlite3 todos.db '.schema todos'"
echo ""
echo "2. ${YELLOW}Merge Types:${NC}"
echo "   - Copy RecurrencePattern type from lib/types-recurring.ts to lib/db.ts"
echo "   - Add recurrence_pattern field to Todo interface"
echo ""
echo "3. ${YELLOW}Update API Routes:${NC}"
echo "   - Merge route-recurring.ts.backup into app/api/todos/[id]/route.ts"
echo "   - Update POST /api/todos to accept recurrence_pattern"
echo ""
echo "4. ${YELLOW}Integrate UI Components:${NC}"
echo "   - Import RecurrenceSelector in your todo form"
echo "   - Import RecurrenceIndicator in your todo list"
echo "   - Update completion handler for recurring todos"
echo ""
echo "5. ${YELLOW}Testing:${NC}"
echo "   - Follow manual testing checklist in IMPLEMENTATION_GUIDE.md"
echo "   - Run: npx playwright test tests/03-recurring-todos.spec.ts"
echo ""
echo "6. ${YELLOW}Documentation:${NC}"
echo "   - Review IMPLEMENTATION_GUIDE.md for detailed steps"
echo "   - Update your USER_GUIDE.md with recurring todos feature"
echo ""
echo -e "${GREEN}📖 Read the IMPLEMENTATION_GUIDE.md for detailed instructions!${NC}"
echo ""
echo -e "${GREEN}Good luck! 🚀${NC}"

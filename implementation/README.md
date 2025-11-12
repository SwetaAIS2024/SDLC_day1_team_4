# Recurring Todos Feature - Complete Implementation

This directory contains the complete implementation of the **Recurring Todos** feature based on PRP-03.

## 📦 What's Included

### Core Files

1. **`lib/types.ts`** - TypeScript type definitions
   - `RecurrencePattern` type
   - Extended `Todo` interface
   - `RecurringTodoCompletionResponse` type

2. **`lib/migrations.ts`** - Database migration
   - Adds `recurrence_pattern` column to `todos` table
   - Safe migration handling (checks for existing column)

3. **`lib/recurrence-utils.ts`** - Business logic utilities
   - `calculateNextDueDate()` - Date calculation for all patterns
   - `getSingaporeNow()` - Singapore timezone handling
   - `formatSingaporeDate()` - Date formatting
   - `getRecurrenceDescription()` - Human-readable labels

4. **`app/api/todos/[id]/route.ts`** - API route handlers
   - GET: Fetch single todo with relations
   - PUT: Update todo + recurring completion logic
   - DELETE: Delete todo instance
   - `handleRecurringTodoCompletion()` - Core recurring logic

### UI Components

5. **`components/RecurrenceSelector.tsx`** - Dropdown selector
   - Select recurrence pattern (daily/weekly/monthly/yearly/none)
   - Visual warnings for edge cases
   - Accessible form control

6. **`components/RecurrenceIndicator.tsx`** - Visual indicators
   - Icon-based recurrence display
   - Compact and full versions
   - Color-coded by pattern

7. **`components/TodoItem.tsx`** - Example todo item
   - Complete todo item component
   - Shows integration with recurrence UI
   - Priority badges, tags, subtasks, recurrence

### Documentation & Tests

8. **`IMPLEMENTATION_GUIDE.md`** - Step-by-step integration guide
   - Database setup
   - API integration
   - UI component usage
   - Testing checklist
   - Troubleshooting

9. **`tests/03-recurring-todos.spec.ts`** - Playwright E2E tests
   - 15+ test cases covering all scenarios
   - Edge case testing
   - Performance tests

## 🚀 Quick Start

### 1. Copy Files to Your Project

```bash
# From this implementation directory, copy to your todo app:

# Types and utilities
cp lib/types.ts ../your-todo-app/lib/
cp lib/recurrence-utils.ts ../your-todo-app/lib/

# API route (merge with existing)
cp app/api/todos/[id]/route.ts ../your-todo-app/app/api/todos/[id]/

# UI components
cp -r components/ ../your-todo-app/components/recurring/

# Tests
cp tests/03-recurring-todos.spec.ts ../your-todo-app/tests/
```

### 2. Run Database Migration

```typescript
// In your lib/db.ts initialization
import { migrateRecurringTodos } from './migrations';

// After database connection
migrateRecurringTodos(db);
```

### 3. Update Your Todo Form

```typescript
import { RecurrenceSelector } from '@/components/recurring/RecurrenceSelector';

function TodoForm() {
  const [recurrencePattern, setRecurrencePattern] = useState(null);
  
  return (
    <form>
      {/* Other fields */}
      <RecurrenceSelector
        value={recurrencePattern}
        onChange={setRecurrencePattern}
      />
    </form>
  );
}
```

### 4. Update Todo Display

```typescript
import { RecurrenceIcon } from '@/components/recurring/RecurrenceIndicator';

function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <span>{todo.title}</span>
          <RecurrenceIcon pattern={todo.recurrence_pattern} />
        </li>
      ))}
    </ul>
  );
}
```

## 📋 Feature Checklist

After integration, verify these work:

### Basic Functionality
- [ ] Can create todo with recurrence pattern
- [ ] Recurrence icon shows in UI
- [ ] Completing recurring todo creates next instance
- [ ] Next instance has correct due date

### Metadata Inheritance
- [ ] Priority inherited to next instance
- [ ] Tags cloned to next instance
- [ ] Subtasks cloned (uncompleted) to next instance
- [ ] Reminder offset inherited

### Pattern-Specific
- [ ] Daily: +1 day
- [ ] Weekly: +7 days
- [ ] Monthly: +1 month (handles overflow)
- [ ] Yearly: +1 year (handles leap years)

### UI/UX
- [ ] Can edit recurrence pattern
- [ ] Can remove recurrence (set to none)
- [ ] Success message shows next due date
- [ ] Warning for monthly on days 29-31

### Edge Cases
- [ ] Works without due date (calculates from now)
- [ ] Prevents schedule drift (uses original due date)
- [ ] Deletes only current instance
- [ ] Month overflow handled (Jan 31 → Feb 28)

## 🧪 Testing

### Run E2E Tests

```bash
# Install Playwright if needed
npm install -D @playwright/test

# Run recurring todos tests
npx playwright test tests/03-recurring-todos.spec.ts

# Run in UI mode
npx playwright test tests/03-recurring-todos.spec.ts --ui

# Run specific test
npx playwright test tests/03-recurring-todos.spec.ts -g "should create next instance"
```

### Manual Testing Script

```bash
# 1. Start your app
npm run dev

# 2. Open browser
open http://localhost:3000

# 3. Follow test cases in IMPLEMENTATION_GUIDE.md section "Manual Testing Checklist"
```

## 🎯 Implementation Priority

Follow this order for easiest integration:

1. **Database** - Run migration first
2. **Types** - Add to lib/db.ts
3. **Utilities** - Add date calculation functions
4. **API Route** - Update PUT /api/todos/[id]
5. **UI Components** - Add selectors and indicators
6. **Integration** - Wire up components in your forms
7. **Testing** - Verify functionality

## 📐 Architecture Decisions

### Why These Patterns?

1. **No Series ID** - Each instance is independent after creation
   - Simpler data model
   - No cascading updates needed
   - Each instance can be modified independently

2. **Synchronous DB Operations** - Using better-sqlite3
   - No async/await needed for queries
   - Simpler code
   - Better performance for small datasets

3. **Singapore Timezone Throughout** - Project requirement
   - All calculations use Asia/Singapore
   - Prevents timezone-related bugs
   - Consistent user experience

4. **Metadata Inheritance** - Copy everything except completion
   - Priority, tags, subtasks all cloned
   - Reminder offset (not absolute time) cloned
   - User expects consistent recurring patterns

5. **Next Instance Created on Completion** - Not pre-generated
   - Reduces database clutter
   - User can modify pattern before next instance
   - Only creates what's needed

## 🔍 Code Walkthrough

### How Recurring Completion Works

```typescript
// 1. User marks todo as complete
PUT /api/todos/42
Body: { completed: true }

// 2. API detects it's a recurring todo
if (body.completed && !todo.completed && todo.recurrence_pattern) {
  return handleRecurringTodoCompletion(todo, userId);
}

// 3. Mark current instance complete
UPDATE todos SET completed = 1, completed_at = NOW() WHERE id = 42

// 4. Calculate next due date
const nextDueDate = calculateNextDueDate(todo.due_date, 'daily');
// Example: '2025-11-13' + daily → '2025-11-14'

// 5. Create next instance
INSERT INTO todos (title, due_date, recurrence_pattern, ...)
VALUES ('Daily standup', '2025-11-14', 'daily', ...)

// 6. Clone tags
INSERT INTO todo_tags (todo_id, tag_id)
SELECT 43, tag_id FROM todo_tags WHERE todo_id = 42

// 7. Clone subtasks (uncompleted)
INSERT INTO subtasks (todo_id, title, position, completed)
SELECT 43, title, position, 0 FROM subtasks WHERE todo_id = 42

// 8. Return both todos
RESPONSE: {
  completed_todo: { id: 42, completed: true, ... },
  next_instance: { id: 43, completed: false, due_date: '2025-11-14', ... }
}
```

## 🛠️ Customization

### Change Recurrence Options

Edit `RecurrenceSelector.tsx`:

```typescript
<select>
  <option value="none">Does not repeat</option>
  <option value="daily">Every day</option>
  <option value="weekly">Every week</option>
  <option value="biweekly">Every 2 weeks</option> {/* Add custom */}
  <option value="monthly">Every month</option>
  <option value="yearly">Every year</option>
</select>
```

Then update `calculateNextDueDate()`:

```typescript
case 'biweekly':
  current.setDate(current.getDate() + 14);
  break;
```

### Add Series Tracking (Advanced)

If you want to track all instances of a recurring todo:

```sql
-- Add series_id column
ALTER TABLE todos ADD COLUMN series_id TEXT;

-- When creating first recurring todo
const seriesId = `recurring-${userId}-${Date.now()}`;

-- Include in next instances
INSERT INTO todos (..., series_id) VALUES (..., seriesId)

-- Query all instances
SELECT * FROM todos WHERE series_id = ?
```

### Custom Recurrence Patterns

For complex patterns (e.g., "every 2nd Tuesday"), you'll need:

1. Additional columns: `recurrence_interval`, `recurrence_day_of_week`
2. More complex date calculation logic
3. Updated UI with day-of-week selectors

## 📚 Related Documentation

- **[PRP-03: Recurring Todos](../PRPs/03-recurring-todos.md)** - Full product requirements
- **[Implementation Guide](IMPLEMENTATION_GUIDE.md)** - Detailed integration steps
- **[Copilot Instructions](../.github/copilot-instructions.md)** - Project patterns

## 🐛 Troubleshooting

### Issue: Next instance not created

**Check:**
1. Database has `recurrence_pattern` column
2. API route includes `handleRecurringTodoCompletion()` function
3. Todo has `recurrence_pattern` value set
4. Browser console for API errors

### Issue: Wrong due date

**Check:**
1. Using `getSingaporeNow()` not `new Date()`
2. `calculateNextDueDate()` imported correctly
3. Pattern is valid: 'daily', 'weekly', 'monthly', 'yearly'

### Issue: Tags/subtasks not cloned

**Check:**
1. Cloning loops present in `handleRecurringTodoCompletion()`
2. Database foreign key relationships set up correctly
3. API returns `TodoWithRelations` type

## 💡 Best Practices

### Do's ✅
- Always use Singapore timezone functions
- Test all four recurrence patterns
- Validate recurrence_pattern in API
- Show clear success messages with next due date
- Handle month overflow gracefully

### Don'ts ❌
- Don't use `new Date()` directly
- Don't pre-generate future instances
- Don't update all instances when editing one
- Don't forget to clone metadata
- Don't skip edge case testing

## 📊 Performance Considerations

### Database Impact
- Each completion = 1 INSERT + multiple tag/subtask INSERTs
- For users with many recurring todos, this is still fast (<50ms)
- better-sqlite3 is synchronous, so no async overhead

### UI Impact
- Recurrence icons add minimal render overhead
- Consider virtualizing todo list if >1000 items
- Date calculations are instant (no API calls)

### Optimization Tips
1. Use database indexes on `recurrence_pattern` for filtering
2. Cache recurrence descriptions (don't recalculate on every render)
3. Debounce recurrence pattern changes in UI

## 🎓 Learning Resources

### Understanding the Code
- Read `calculateNextDueDate()` first - core logic
- Follow API route flow in comments
- Check test cases for expected behavior

### Extending the Feature
- Start with IMPLEMENTATION_GUIDE.md "Advanced Features"
- Review PRP-03 "Out of Scope" for ideas
- Consider user feedback for new patterns

## ✅ Success Criteria

Your implementation is complete when:

1. ✅ All files copied and integrated
2. ✅ Database migration run successfully
3. ✅ Can create recurring todos via UI
4. ✅ Completing creates next instance
5. ✅ All metadata inherited correctly
6. ✅ All four patterns work (daily/weekly/monthly/yearly)
7. ✅ Edge cases handled (month overflow, no due date, etc.)
8. ✅ Tests passing (or adapted to your UI)
9. ✅ Documentation reviewed by team
10. ✅ No console errors in browser/server

---

**Version:** 1.0  
**Last Updated:** November 12, 2025  
**PRP Reference:** [03-recurring-todos.md](../PRPs/03-recurring-todos.md)  
**Author:** Development Team  

For questions or issues, refer to:
- IMPLEMENTATION_GUIDE.md (integration steps)
- PRP-03 (feature requirements)
- `.github/copilot-instructions.md` (project patterns)

# Playwright E2E Tests - Todo App

This directory contains End-to-End (E2E) tests for the Todo application using Playwright.

## Test Coverage

### ✅ Complete Test Suite (11 Feature Areas)

1. **01-authentication.spec.ts** - Authentication Flow (PRP-01)
   - User registration with WebAuthn/Passkeys
   - User login with existing credentials
   - Session persistence
   - Logout functionality
   - Redirect behavior

2. **02-todo-crud-priority.spec.ts** - Todo CRUD & Priority System (PRP-02)
   - Creating todos with different priorities (high, medium, low)
   - Priority badge display
   - Priority filtering
   - Editing todo priority
   - Completing and deleting todos
   - Priority-based sorting

3. **03-recurring-todos.spec.ts** - Recurring Todos (PRP-03)
   - Daily recurring todos
   - Weekly recurring todos
   - Monthly recurring todos
   - Yearly recurring todos
   - Automatic next instance creation on completion
   - Priority preservation in recurring instances
   - Recurrence pattern editing

4. **04-reminders-notifications.spec.ts** - Reminders & Notifications (PRP-04)
   - Notification permission handling
   - Creating todos with various reminder times (15min, 30min, 1hr, 2hr, 1day, 2days, 1week)
   - Reminder indicator display
   - Editing reminder times
   - Removing reminders
   - Combining priority, recurrence, and reminders
   - Reminder preservation in recurring todos

5. **05-subtasks.spec.ts** - Subtasks & Checklists (PRP-05)
   - Adding subtasks to todos
   - Checking/unchecking subtasks
   - Progress tracking (0/3, 1/2, etc.)
   - Deleting subtasks
   - Subtask count display
   - Preserving subtasks when editing
   - Completed status when all subtasks checked
   - Reordering subtasks
   - Subtask persistence after reload

6. **06-tags.spec.ts** - Tags & Categories (PRP-06)
   - Creating new tags
   - Assigning tags to todos
   - Color-coded tag display
   - Filtering todos by tag
   - Multiple tags per todo
   - Editing tag properties
   - Deleting tags
   - Tag count indicators
   - Removing tags from todos
   - Tag preservation when completing todos

7. **07-templates.spec.ts** - Todo Templates (PRP-07)
   - Viewing templates section
   - Creating new templates
   - Templates with subtasks
   - Using templates to create todos
   - Due date offset application
   - Editing templates
   - Deleting templates
   - Templates with priority and recurrence
   - Listing all templates
   - Templates with tags

8. **08-search-filtering.spec.ts** - Search & Advanced Filtering (PRP-08)
   - Searching todos by title
   - Case-insensitive search
   - Clearing search results
   - Filtering by completion status
   - Filtering by due date (overdue)
   - Combining search with priority filter
   - Date range filtering
   - Filter count/summary display
   - Filtering by tag
   - Resetting all filters
   - No results message

9. **09-export-import.spec.ts** - Export & Import (PRP-09)
   - Export button visibility
   - Exporting todos to JSON
   - Export including subtasks and tags
   - Import button visibility
   - Importing todos from JSON
   - Import preserving priority levels
   - Handling duplicate titles
   - Error handling for invalid JSON
   - Export preserving completed status
   - Import with subtasks

10. **10-calendar-view.spec.ts** - Calendar View (PRP-10)
    - Navigating to calendar view
    - Displaying current month
    - Days of week headers
    - Next/previous month navigation
    - Today button functionality
    - Displaying todos on calendar dates
    - Highlighting today's date
    - Todo count on calendar dates
    - Clicking date to view todos
    - Holiday indicators
    - Priority indicators in calendar
    - Navigating back to todo list

11. **11-dark-mode.spec.ts** - Dark Mode (PRP-11)
    - Dark mode toggle button visibility
    - Toggling to dark mode
    - Toggling back to light mode
    - Dark mode persistence after reload
    - Dark mode across all pages
    - Readable text in dark mode
    - Toggle button icon updates
    - Priority badges in dark mode
    - Forms and inputs styling
    - Calendar styling in dark mode
    - System preference respect
    - Dark mode across authentication
    - Button styling in dark mode

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Playwright** - Already installed via `npm install -D @playwright/test`
3. **Chromium browser** - Already installed via `npx playwright install chromium`

## Running Tests

### Run All Tests

```bash
npx playwright test
```

### Run Specific Test File

```bash
# Authentication tests only
npx playwright test tests/01-authentication.spec.ts

# Priority system tests only
npx playwright test tests/02-todo-crud-priority.spec.ts

# Recurring todos tests only
npx playwright test tests/03-recurring-todos.spec.ts

# Reminders & notifications tests only
npx playwright test tests/04-reminders-notifications.spec.ts
```

### Run Tests in UI Mode (Interactive)

```bash
npx playwright test --ui
```

This opens the Playwright Test UI where you can:
- See all tests
- Run tests selectively
- Watch tests in real-time
- Debug failing tests
- Inspect DOM snapshots

### Run Tests in Headed Mode (See Browser)

```bash
npx playwright test --headed
```

### Run Tests with Debug Mode

```bash
npx playwright test --debug
```

## Test Configuration

The tests are configured in `playwright.config.ts` with:

- **Base URL**: `http://localhost:3000`
- **Timezone**: `Asia/Singapore` (matches app timezone)
- **Browser**: Chromium with WebAuthn virtual authenticator enabled
- **Web Server**: Automatically starts dev server before tests
- **Retries**: 2 retries in CI, 0 in local development

## WebAuthn Virtual Authenticator

All tests use Playwright's virtual authenticator for WebAuthn testing:

```typescript
const client = await page.context().newCDPSession(page);
await client.send('WebAuthn.enable');
await client.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2',
    transport: 'usb',
    hasResidentKey: true,
    hasUserVerification: true,
    isUserVerified: true,
  },
});
```

This simulates a hardware security key or biometric authenticator without requiring actual hardware.

## Test Data Strategy

Each test creates its own user with a unique timestamp:

```typescript
const username = `testuser_${Date.now()}`;
```

This ensures test isolation and prevents conflicts.

## Viewing Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

This opens a detailed report showing:
- Test execution results
- Screenshots on failure
- Execution traces
- Performance metrics

## CI/CD Integration

The tests are CI-ready with the following features:

- **Automatic retries** (2 retries in CI mode)
- **Parallel execution** disabled in CI for SQLite compatibility
- **Automatic web server startup**
- **HTML report generation**

To run in CI mode:

```bash
CI=true npx playwright test
```

## Common Test Patterns

### 1. Authentication Setup (beforeEach)

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  const username = `testuser_${Date.now()}`;
  
  // Enable WebAuthn
  const client = await page.context().newCDPSession(page);
  await client.send('WebAuthn.enable');
  await client.send('WebAuthn.addVirtualAuthenticator', { ... });
  
  // Register
  await page.fill('input[type="text"]', username);
  await page.click('button:has-text("Register")');
  await page.waitForURL('**/todos', { timeout: 5000 });
});
```

### 2. Creating a Todo

```typescript
await page.fill('input[placeholder*="What needs to be done"]', 'Todo title');
await page.locator('select').first().selectOption('high');
await page.fill('input[type="datetime-local"]', dateString);
await page.click('button:has-text("Add")');
await expect(page.locator('text=Todo title')).toBeVisible();
```

### 3. Setting Due Date

```typescript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dateStr = tomorrow.toISOString().slice(0, 16);
await page.fill('input[type="datetime-local"]', dateStr);
```

### 4. Selecting Dropdowns

```typescript
// Priority (1st select)
await page.locator('select').first().selectOption('high');

// Recurrence (2nd select)
await page.locator('select').nth(1).selectOption('daily');

// Reminder (3rd select)
await page.locator('select').nth(2).selectOption('60');
```

## Troubleshooting

### Tests Timing Out

If tests timeout at login, ensure:
1. Dev server is running (`npm run dev`)
2. Database file `todos.db` exists and is accessible
3. WebAuthn virtual authenticator is properly enabled

### Tests Failing Due to Timing Issues

Add wait statements:

```typescript
await page.waitForTimeout(1000); // Wait 1 second
await page.waitForSelector('text=My Todo'); // Wait for element
await page.waitForURL('**/todos'); // Wait for navigation
```

### Database Conflicts

Each test creates a unique user, but if you encounter SQLite locking:

```bash
# Stop all running servers
pkill -f "next dev"

# Delete and recreate database
rm todos.db
npm run dev
```

### Visual Debugging

Use Playwright Inspector:

```bash
npx playwright test --debug
```

Or add `await page.pause()` in your test to pause execution.

## Best Practices

1. **Use data-testid attributes** for stable selectors (consider adding to components)
2. **Wait for elements** before interacting (`waitForSelector`, `waitForTimeout`)
3. **Clean up after tests** (database is isolated per user, so cleanup is automatic)
4. **Test user flows**, not implementation details
5. **Keep tests independent** - each test should work in isolation

## Performance Considerations

- **SQLite limitations**: Tests run sequentially to avoid database locking
- **WebAuthn delays**: Virtual authenticator adds ~1 second per auth operation
- **Network idle**: Some tests use `waitForLoadState('networkidle')` for stability

## Next Steps

To add more tests:

1. Create a new `.spec.ts` file in the `tests/` directory
2. Follow the authentication setup pattern in `beforeEach`
3. Use existing test files as reference
4. Run in UI mode for faster iteration: `npx playwright test --ui`

## Resources

- [Playwright Documentation](https://playwright.dev)
- [WebAuthn Testing](https://playwright.dev/docs/api/class-cdpsession)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Best Practices](https://playwright.dev/docs/best-practices)

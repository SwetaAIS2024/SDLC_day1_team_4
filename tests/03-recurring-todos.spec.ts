import { test, expect } from '@playwright/test';

/**
 * Test Suite: Recurring Todos
 * Tests PRP-03: Automatic recurring task generation
 */

test.describe('Recurring Todos', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `recurtest_${Date.now()}`;
    
    // Enable virtual authenticator
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
    
    await page.fill('input[type="text"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('**/todos', { timeout: 5000 });
  });

  test('should show recurrence selector dropdown', async ({ page }) => {
    // Check that recurrence selector exists
    const recurrenceSelects = page.locator('select');
    const count = await recurrenceSelects.count();
    
    // Should have at least 2 selects (priority and recurrence)
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should create a daily recurring todo', async ({ page }) => {
    // Fill in todo
    await page.fill('input[placeholder*="What needs to be done"]', 'Daily standup');
    
    // Set due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Select daily recurrence (assuming it's the second select)
    const selects = page.locator('select');
    await selects.nth(1).selectOption('daily');
    
    // Add todo
    await page.click('button:has-text("Add")');
    
    // Verify todo appears with recurrence indicator
    await expect(page.locator('text=Daily standup')).toBeVisible({ timeout: 3000 });
    
    // Look for recurrence icon (🔄 or similar)
    const todoRow = page.locator('text=Daily standup').locator('..');
    await expect(todoRow.locator('text=/🔄|📅|🗓️|📆/')).toBeVisible();
  });

  test('should create a weekly recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Weekly team meeting');
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dateStr = nextWeek.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('weekly');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Weekly team meeting')).toBeVisible({ timeout: 3000 });
    
    // Verify recurrence indicator
    const todoRow = page.locator('text=Weekly team meeting').locator('..');
    await expect(todoRow.locator('text=/🔄|📅|🗓️|📆/')).toBeVisible();
  });

  test('should create a monthly recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Monthly report');
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const dateStr = nextMonth.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('monthly');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Monthly report')).toBeVisible({ timeout: 3000 });
  });

  test('should create a yearly recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Annual review');
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const dateStr = nextYear.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('yearly');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Annual review')).toBeVisible({ timeout: 3000 });
  });

  test('should create next instance when completing recurring todo', async ({ page }) => {
    // Create a daily recurring todo
    await page.fill('input[placeholder*="What needs to be done"]', 'Daily task to complete');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('daily');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Complete the todo
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(1500);
    
    // Refresh to see if next instance was created
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Should still see the task (next instance created)
    const todoCount = await page.locator('text=Daily task to complete').count();
    expect(todoCount).toBeGreaterThan(0);
  });

  test('should preserve priority when creating next recurring instance', async ({ page }) => {
    // Create high priority daily recurring todo
    await page.fill('input[placeholder*="What needs to be done"]', 'High priority daily');
    
    const selects = page.locator('select');
    await selects.first().selectOption('high');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    await selects.nth(1).selectOption('daily');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Verify high priority badge
    await expect(page.locator('span:has-text("High")')).toBeVisible();
    
    // Complete the todo
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(1500);
    
    // Refresh and check priority is still high
    await page.reload();
    await page.waitForTimeout(1000);
    
    await expect(page.locator('span:has-text("High")')).toBeVisible();
  });

  test('should show recurrence pattern description on hover', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Recurring with tooltip');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('weekly');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Look for recurrence icon with title/tooltip
    const recurrenceIcon = page.locator('[title*="Repeats"]').or(page.locator('[title*="weekly"]'));
    await expect(recurrenceIcon).toBeVisible();
  });

  test('should allow editing recurrence pattern', async ({ page }) => {
    // Create a daily recurring todo
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to edit recurrence');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('daily');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Click edit
    await page.click('button:has-text("Edit")');
    
    // Change recurrence to weekly
    const editSelects = page.locator('select');
    await editSelects.nth(2).selectOption('weekly'); // Third select in edit mode
    
    // Save
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    // Verify it's still there (recurrence changed)
    await expect(page.locator('text=Task to edit recurrence')).toBeVisible();
  });
});

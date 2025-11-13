import { test, expect } from '@playwright/test';

/**
 * Test Suite: Reminders & Notifications
 * Tests PRP-04: Browser notification system for todo reminders
 */

test.describe('Reminders & Notifications', () => {
  test.beforeEach(async ({ page, context }) => {
    // Grant notification permissions
    await context.grantPermissions(['notifications']);
    
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `notiftest_${Date.now()}`;
    
    // Enable virtual authenticator
    const client = await context.newCDPSession(page);
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

  test('should show notification permission button', async ({ page }) => {
    // Look for enable notifications button or status
    const notificationButton = page.locator('button:has-text("Enable Notifications")').or(
      page.locator('text=/Notifications Enabled|Notifications On/')
    );
    
    await expect(notificationButton).toBeVisible({ timeout: 5000 });
  });

  test('should show notification enabled status when granted', async ({ page }) => {
    // Since we granted permissions in beforeEach, should show enabled status
    const enabledStatus = page.locator('text=/Notifications Enabled|✅/');
    await expect(enabledStatus).toBeVisible({ timeout: 5000 });
  });

  test('should show reminder selector in create form', async ({ page }) => {
    // Check that reminder selector exists (should be third select)
    const selects = page.locator('select');
    const count = await selects.count();
    
    // Should have at least 3 selects (priority, recurrence, reminder)
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('should create todo with 15 minute reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task with 15min reminder');
    
    // Set due date to 20 minutes from now
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 20);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Select 15 minute reminder (third select)
    const selects = page.locator('select');
    await selects.nth(2).selectOption('15');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Task with 15min reminder')).toBeVisible({ timeout: 3000 });
    
    // Should show reminder indicator (bell icon)
    const todoRow = page.locator('text=Task with 15min reminder').locator('..');
    await expect(todoRow.locator('text=/🔔|⏰/')).toBeVisible();
  });

  test('should create todo with 1 hour reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task with 1hr reminder');
    
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(2).selectOption('60');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Task with 1hr reminder')).toBeVisible({ timeout: 3000 });
    
    const todoRow = page.locator('text=Task with 1hr reminder').locator('..');
    await expect(todoRow.locator('text=/🔔|⏰/')).toBeVisible();
  });

  test('should create todo with 1 day reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task with 1day reminder');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(2).selectOption('1440');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Task with 1day reminder')).toBeVisible({ timeout: 3000 });
  });

  test('should create todo with 1 week reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task with 1week reminder');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 8);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(2).selectOption('10080');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Task with 1week reminder')).toBeVisible({ timeout: 3000 });
  });

  test('should display reminder time in todo list', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to check reminder display');
    
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(2).selectOption('30');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Should show "30 min before" or similar
    const todoRow = page.locator('text=Task to check reminder display').locator('..');
    await expect(todoRow.locator('text=/30 min before|30min/')).toBeVisible();
  });

  test('should allow editing reminder time', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to edit reminder');
    
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 3);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(2).selectOption('60');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Edit the todo
    await page.click('button:has-text("Edit")');
    
    // Change reminder to 30 minutes
    const editSelects = page.locator('select');
    await editSelects.nth(3).selectOption('30'); // Fourth select in edit mode
    
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    // Should show updated reminder
    const todoRow = page.locator('text=Task to edit reminder').locator('..');
    await expect(todoRow.locator('text=/30 min before/')).toBeVisible();
  });

  test('should allow removing reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to remove reminder');
    
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 2);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(2).selectOption('60');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Verify reminder is there
    let todoRow = page.locator('text=Task to remove reminder').locator('..');
    await expect(todoRow.locator('text=/🔔|⏰/')).toBeVisible();
    
    // Edit and remove reminder
    await page.click('button:has-text("Edit")');
    
    const editSelects = page.locator('select');
    await editSelects.nth(3).selectOption(''); // Select "None"
    
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    // Reminder indicator should be gone
    todoRow = page.locator('text=Task to remove reminder').locator('..');
    await expect(todoRow.locator('text=/🔔|⏰/')).not.toBeVisible();
  });

  test('should combine priority, recurrence, and reminder', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Full featured task');
    
    const selects = page.locator('select');
    
    // Set high priority
    await selects.first().selectOption('high');
    
    // Set due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Set weekly recurrence
    await selects.nth(1).selectOption('weekly');
    
    // Set 1 day reminder
    await selects.nth(2).selectOption('1440');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Should show all indicators
    await expect(page.locator('text=Full featured task')).toBeVisible();
    await expect(page.locator('span:has-text("High")')).toBeVisible();
    
    const todoRow = page.locator('text=Full featured task').locator('..');
    await expect(todoRow.locator('text=/🔄|📅|🗓️|📆/')).toBeVisible(); // Recurrence
    await expect(todoRow.locator('text=/🔔|⏰/')).toBeVisible(); // Reminder
  });

  test('should preserve reminder when completing recurring todo', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Recurring with reminder');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const dateStr = futureDate.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    const selects = page.locator('select');
    await selects.nth(1).selectOption('daily');
    await selects.nth(2).selectOption('60');
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Complete the todo
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    await page.waitForTimeout(1500);
    
    // Refresh to see next instance
    await page.reload();
    await page.waitForTimeout(1000);
    
    // Next instance should still have reminder
    const todoRow = page.locator('text=Recurring with reminder').locator('..');
    await expect(todoRow.locator('text=/🔔|⏰/')).toBeVisible();
  });
});

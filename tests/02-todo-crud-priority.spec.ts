import { test, expect } from '@playwright/test';

/**
 * Test Suite: Todo CRUD with Priority System
 * Tests PRP-02: Priority-based task management
 */

test.describe('Todo CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `todotest_${Date.now()}`;
    
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

  test('should create a todo with high priority', async ({ page }) => {
    // Fill in todo title
    await page.fill('input[placeholder*="What needs to be done"]', 'High priority task');
    
    // Select high priority
    const prioritySelect = page.locator('select').first();
    await prioritySelect.selectOption('high');
    
    // Set due date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Click Add button
    await page.click('button:has-text("Add")');
    
    // Wait for todo to appear
    await expect(page.locator('text=High priority task')).toBeVisible({ timeout: 3000 });
    
    // Verify high priority badge is visible
    await expect(page.locator('span:has-text("High")')).toBeVisible();
  });

  test('should create a todo with medium priority', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Medium priority task');
    
    const prioritySelect = page.locator('select').first();
    await prioritySelect.selectOption('medium');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Medium priority task')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('span:has-text("Medium")')).toBeVisible();
  });

  test('should create a todo with low priority', async ({ page }) => {
    await page.fill('input[placeholder*="What needs to be done"]', 'Low priority task');
    
    const prioritySelect = page.locator('select').first();
    await prioritySelect.selectOption('low');
    
    await page.click('button:has-text("Add")');
    
    await expect(page.locator('text=Low priority task')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('span:has-text("Low")')).toBeVisible();
  });

  test('should display priority count badges', async ({ page }) => {
    // Create todos with different priorities
    const priorities = ['high', 'medium', 'low'];
    
    for (const priority of priorities) {
      await page.fill('input[placeholder*="What needs to be done"]', `${priority} task`);
      await page.locator('select').first().selectOption(priority);
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(500);
    }
    
    // Check that priority filter badges show counts
    await expect(page.locator('text=High').first()).toBeVisible();
    await expect(page.locator('text=Medium').first()).toBeVisible();
    await expect(page.locator('text=Low').first()).toBeVisible();
  });

  test('should filter todos by priority', async ({ page }) => {
    // Create todos with different priorities
    await page.fill('input[placeholder*="What needs to be done"]', 'High task');
    await page.locator('select').first().selectOption('high');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="What needs to be done"]', 'Low task');
    await page.locator('select').first().selectOption('low');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Filter by high priority
    await page.click('button:has-text("High")');
    
    // Should see high task, not low task
    await expect(page.locator('text=High task')).toBeVisible();
    await expect(page.locator('text=Low task')).not.toBeVisible();
  });

  test('should edit todo priority', async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to edit');
    await page.locator('select').first().selectOption('low');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Click edit button
    await page.click('button:has-text("Edit")');
    
    // Change priority to high
    await page.locator('select').nth(1).selectOption('high');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify priority changed
    await expect(page.locator('span:has-text("High")')).toBeVisible();
  });

  test('should complete a todo', async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to complete');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Click checkbox to complete
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    
    // Verify strikethrough on completed task
    await expect(page.locator('text=Task to complete').locator('..')).toHaveClass(/line-through/);
  });

  test('should delete a todo', async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder*="What needs to be done"]', 'Task to delete');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Click delete button
    await page.click('button:has-text("Delete")');
    
    // Verify todo is gone
    await expect(page.locator('text=Task to delete')).not.toBeVisible();
  });

  test('should sort todos by priority (high, medium, low)', async ({ page }) => {
    // Create todos in random order
    await page.fill('input[placeholder*="What needs to be done"]', 'Low task');
    await page.locator('select').first().selectOption('low');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="What needs to be done"]', 'High task');
    await page.locator('select').first().selectOption('high');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="What needs to be done"]', 'Medium task');
    await page.locator('select').first().selectOption('medium');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Get all todo titles in order
    const todos = await page.locator('[class*="todo"]').allTextContents();
    
    // High should come before Medium, Medium before Low
    const highIndex = todos.findIndex(t => t.includes('High task'));
    const mediumIndex = todos.findIndex(t => t.includes('Medium task'));
    const lowIndex = todos.findIndex(t => t.includes('Low task'));
    
    expect(highIndex).toBeLessThan(mediumIndex);
    expect(mediumIndex).toBeLessThan(lowIndex);
  });
});

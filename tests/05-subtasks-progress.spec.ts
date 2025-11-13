import { test, expect } from '@playwright/test';

test.describe('Subtasks & Progress Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('http://localhost:3001/login');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // If already logged in, go to todos
    const currentUrl = page.url();
    if (currentUrl.includes('/todos')) {
      return;
    }
    
    // Otherwise perform login
    // Note: Adjust this based on your actual auth mechanism
    await page.goto('http://localhost:3001/todos');
    await page.waitForLoadState('networkidle');
  });

  test('should expand/collapse subtasks section', async ({ page }) => {
    // Create a todo first
    await page.fill('input[placeholder="Add a new todo..."]', 'Test Todo with Subtasks');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    // Wait for todo to appear
    await page.waitForSelector('text=Test Todo with Subtasks');
    
    // Click subtasks button to expand
    await page.click('button:has-text("▶ Subtasks")');
    
    // Verify subtask input appears
    await expect(page.locator('input[placeholder="Add a subtask..."]')).toBeVisible();
    
    // Verify button text changed to collapse indicator
    await expect(page.locator('button:has-text("▼ Subtasks")')).toBeVisible();
    
    // Click again to collapse
    await page.click('button:has-text("▼ Subtasks")');
    
    // Verify subtask input is hidden
    await expect(page.locator('input[placeholder="Add a subtask..."]')).not.toBeVisible();
  });

  test('should create subtasks', async ({ page }) => {
    // Create a todo first
    await page.fill('input[placeholder="Add a new todo..."]', 'Todo for Subtask Test');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    // Wait for todo to appear
    await page.waitForSelector('text=Todo for Subtask Test');
    
    // Expand subtasks
    await page.click('button:has-text("▶ Subtasks")');
    
    // Add first subtask
    await page.fill('input[placeholder="Add a subtask..."]', 'First Subtask');
    await page.click('button:has-text("Add")');
    
    // Verify subtask appears
    await expect(page.locator('text=First Subtask')).toBeVisible();
    
    // Add second subtask
    await page.fill('input[placeholder="Add a subtask..."]', 'Second Subtask');
    await page.click('button:has-text("Add")');
    
    // Verify second subtask appears
    await expect(page.locator('text=Second Subtask')).toBeVisible();
    
    // Verify progress shows 0/2
    await expect(page.locator('text=0/2 subtasks')).toBeVisible();
  });

  test('should toggle subtask completion and update progress', async ({ page }) => {
    // Create a todo and subtasks
    await page.fill('input[placeholder="Add a new todo..."]', 'Progress Test Todo');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Progress Test Todo');
    await page.click('button:has-text("▶ Subtasks")');
    
    // Add 3 subtasks
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[placeholder="Add a subtask..."]', `Subtask ${i}`);
      await page.click('button:has-text("Add")');
      await page.waitForSelector(`text=Subtask ${i}`);
    }
    
    // Initially should show 0/3 subtasks (0%)
    await expect(page.locator('text=0/3 subtasks')).toBeVisible();
    await expect(page.locator('text=0%')).toBeVisible();
    
    // Complete first subtask
    const firstCheckbox = page.locator('input[type="checkbox"]').nth(1); // 0 is todo checkbox
    await firstCheckbox.check();
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Should show 1/3 subtasks (33%)
    await expect(page.locator('text=1/3 subtasks')).toBeVisible();
    await expect(page.locator('text=33%')).toBeVisible();
    
    // Complete second subtask
    const secondCheckbox = page.locator('input[type="checkbox"]').nth(2);
    await secondCheckbox.check();
    
    await page.waitForTimeout(500);
    
    // Should show 2/3 subtasks (67%)
    await expect(page.locator('text=2/3 subtasks')).toBeVisible();
    await expect(page.locator('text=67%')).toBeVisible();
    
    // Complete third subtask
    const thirdCheckbox = page.locator('input[type="checkbox"]').nth(3);
    await thirdCheckbox.check();
    
    await page.waitForTimeout(500);
    
    // Should show 3/3 subtasks (100%)
    await expect(page.locator('text=3/3 subtasks')).toBeVisible();
    await expect(page.locator('text=100%')).toBeVisible();
  });

  test('should delete subtasks', async ({ page }) => {
    // Create a todo and subtasks
    await page.fill('input[placeholder="Add a new todo..."]', 'Delete Subtask Test');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Delete Subtask Test');
    await page.click('button:has-text("▶ Subtasks")');
    
    // Add 2 subtasks
    await page.fill('input[placeholder="Add a subtask..."]', 'Subtask to Delete');
    await page.click('button:has-text("Add")');
    
    await page.fill('input[placeholder="Add a subtask..."]', 'Subtask to Keep');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=2/2 subtasks');
    
    // Hover over first subtask to reveal delete button
    const firstSubtask = page.locator('text=Subtask to Delete').locator('..');
    await firstSubtask.hover();
    
    // Click delete button
    await firstSubtask.locator('button:has-text("✕")').click();
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Verify subtask is deleted
    await expect(page.locator('text=Subtask to Delete')).not.toBeVisible();
    await expect(page.locator('text=Subtask to Keep')).toBeVisible();
    
    // Should show 0/1 subtasks
    await expect(page.locator('text=0/1 subtasks')).toBeVisible();
  });

  test('should show progress bar visually', async ({ page }) => {
    // Create a todo and subtasks
    await page.fill('input[placeholder="Add a new todo..."]', 'Visual Progress Test');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Visual Progress Test');
    await page.click('button:has-text("▶ Subtasks")');
    
    // Add 2 subtasks
    await page.fill('input[placeholder="Add a subtask..."]', 'Subtask 1');
    await page.click('button:has-text("Add")');
    
    await page.fill('input[placeholder="Add a subtask..."]', 'Subtask 2');
    await page.click('button:has-text("Add")');
    
    // Collapse subtasks to see progress bar clearly
    await page.click('button:has-text("▼ Subtasks")');
    
    // Verify progress bar exists
    const progressBar = page.locator('.bg-blue-500').first();
    await expect(progressBar).toBeVisible();
    
    // Initially should be 0% width (or very small)
    const initialWidth = await progressBar.evaluate((el) => el.style.width);
    expect(initialWidth).toBe('0%');
    
    // Expand and complete one subtask
    await page.click('button:has-text("▶ Subtasks")');
    await page.locator('input[type="checkbox"]').nth(1).check();
    await page.waitForTimeout(500);
    
    // Collapse to see progress
    await page.click('button:has-text("▼ Subtasks")');
    
    // Progress bar should be 50% width
    const halfWidth = await progressBar.evaluate((el) => el.style.width);
    expect(halfWidth).toBe('50%');
  });

  test('should handle Enter key to add subtask', async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder="Add a new todo..."]', 'Enter Key Test');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Enter Key Test');
    await page.click('button:has-text("▶ Subtasks")');
    
    // Type subtask and press Enter
    const subtaskInput = page.locator('input[placeholder="Add a subtask..."]');
    await subtaskInput.fill('Subtask via Enter');
    await subtaskInput.press('Enter');
    
    // Wait for subtask to appear
    await page.waitForTimeout(500);
    
    // Verify subtask was created
    await expect(page.locator('text=Subtask via Enter')).toBeVisible();
    await expect(page.locator('text=0/1 subtasks')).toBeVisible();
  });

  test('should not create empty subtasks', async ({ page }) => {
    // Create a todo
    await page.fill('input[placeholder="Add a new todo..."]', 'Empty Subtask Test');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Empty Subtask Test');
    await page.click('button:has-text("▶ Subtasks")');
    
    // Try to add empty subtask (button should be disabled)
    const addButton = page.locator('button:has-text("Add")');
    await expect(addButton).toBeDisabled();
    
    // Add spaces only
    await page.fill('input[placeholder="Add a subtask..."]', '   ');
    
    // Button should still be disabled
    await expect(addButton).toBeDisabled();
  });

  test('should delete todo with subtasks (CASCADE)', async ({ page }) => {
    // Create a todo with subtasks
    await page.fill('input[placeholder="Add a new todo..."]', 'Todo to Delete with Subtasks');
    await page.fill('input[type="datetime-local"]', '2025-12-31T12:00');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Todo to Delete with Subtasks');
    await page.click('button:has-text("▶ Subtasks")');
    
    // Add a subtask
    await page.fill('input[placeholder="Add a subtask..."]', 'Subtask of Deleted Todo');
    await page.click('button:has-text("Add")');
    
    await page.waitForSelector('text=Subtask of Deleted Todo');
    
    // Setup dialog handler to accept confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Delete the todo
    await page.click('button:has-text("Delete")');
    
    // Wait for deletion
    await page.waitForTimeout(500);
    
    // Verify todo and subtask are both gone
    await expect(page.locator('text=Todo to Delete with Subtasks')).not.toBeVisible();
    await expect(page.locator('text=Subtask of Deleted Todo')).not.toBeVisible();
  });
});

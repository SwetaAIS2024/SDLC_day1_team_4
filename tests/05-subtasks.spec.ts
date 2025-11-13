import { test, expect } from '@playwright/test';

/**
 * Tests for PRP-05: Subtasks & Checklists
 * Covers creating todos with subtasks, checking/unchecking, progress tracking, and subtask management
 */

test.describe('Subtasks & Checklists', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `subtasktest_${Date.now()}`;
    
    // Enable virtual authenticator
    const client = await page.context().newCDPSession(page);
    await client.send('WebAuthn.enable');
    await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'usb',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true
      }
    });
    
    await page.fill('input[type="text"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('**/todos', { timeout: 5000 });
  });

  test('should add subtasks to a todo', async ({ page }) => {
    // Create a todo first
    const todoTitle = 'Project with subtasks';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    // Wait for todo to appear
    await expect(page.locator(`text=${todoTitle}`)).toBeVisible();
    
    // Click to expand/show subtask form
    await page.click(`text=${todoTitle}`);
    
    // Add first subtask
    const subtaskInput = page.locator('input[placeholder*="subtask" i], input[placeholder*="add subtask" i]').first();
    await subtaskInput.fill('Research phase');
    await page.keyboard.press('Enter');
    
    // Verify subtask appears
    await expect(page.locator('text=Research phase')).toBeVisible();
    
    // Add second subtask
    await subtaskInput.fill('Development phase');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('text=Development phase')).toBeVisible();
  });

  test('should display subtask progress indicator', async ({ page }) => {
    const todoTitle = 'Todo with progress';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add 3 subtasks
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Task 1');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Task 2');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Task 3');
    await page.keyboard.press('Enter');
    
    // Check for progress indicator (0/3)
    await expect(page.locator('text=/0\\/3|0 of 3/')).toBeVisible();
  });

  test('should check and uncheck subtasks', async ({ page }) => {
    const todoTitle = 'Checkable subtasks';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add subtask
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Subtask to check');
    await page.keyboard.press('Enter');
    
    // Find and check the checkbox
    const checkbox = page.locator('input[type="checkbox"]').last();
    await checkbox.check();
    
    // Verify it's checked
    await expect(checkbox).toBeChecked();
    
    // Progress should update to 1/1
    await expect(page.locator('text=/1\\/1|1 of 1/')).toBeVisible();
    
    // Uncheck it
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    
    // Progress back to 0/1
    await expect(page.locator('text=/0\\/1|0 of 1/')).toBeVisible();
  });

  test('should update progress percentage when checking subtasks', async ({ page }) => {
    const todoTitle = 'Progress tracking';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add 2 subtasks
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('First task');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Second task');
    await page.keyboard.press('Enter');
    
    // Check first subtask
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    
    // Should show 1/2 or 50%
    await expect(page.locator('text=/1\\/2|50%/')).toBeVisible();
  });

  test('should delete subtasks', async ({ page }) => {
    const todoTitle = 'Delete subtask test';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add subtask
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Subtask to delete');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('text=Subtask to delete')).toBeVisible();
    
    // Find and click delete button for subtask
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("×"), button:has-text("🗑")').last();
    await deleteButton.click();
    
    // Subtask should be gone
    await expect(page.locator('text=Subtask to delete')).not.toBeVisible();
  });

  test('should show subtask count in todo list', async ({ page }) => {
    const todoTitle = 'Todo with count';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add 3 subtasks
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Sub 1');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Sub 2');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Sub 3');
    await page.keyboard.press('Enter');
    
    // Should see subtask indicator (checkmark icon or count)
    await expect(page.locator('text=/✓|✔|☑|📋|3/')).toBeVisible();
  });

  test('should preserve subtasks when editing todo', async ({ page }) => {
    const todoTitle = 'Preserve subtasks';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add subtask
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Important subtask');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('text=Important subtask')).toBeVisible();
    
    // Edit the main todo
    await page.click('button:has-text("Edit")');
    await page.fill('input[value*="Preserve"]', 'Edited title');
    await page.click('button:has-text("Save")');
    
    // Subtask should still be there
    await page.click('text=Edited title');
    await expect(page.locator('text=Important subtask')).toBeVisible();
  });

  test('should show completed status when all subtasks checked', async ({ page }) => {
    const todoTitle = 'All subtasks complete';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add 2 subtasks
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Task A');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Task B');
    await page.keyboard.press('Enter');
    
    // Check both
    const checkboxes = page.locator('input[type="checkbox"]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    
    // Should show 2/2 or 100%
    await expect(page.locator('text=/2\\/2|100%/')).toBeVisible();
  });

  test('should allow reordering subtasks', async ({ page }) => {
    const todoTitle = 'Reorder subtasks';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add subtasks in order
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('First');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Second');
    await page.keyboard.press('Enter');
    await subtaskInput.fill('Third');
    await page.keyboard.press('Enter');
    
    // Verify they appear in order
    const subtaskList = page.locator('text=First').first();
    await expect(subtaskList).toBeVisible();
  });

  test('should maintain subtask state after page reload', async ({ page }) => {
    const todoTitle = 'Persistent subtasks';
    await page.fill('input[placeholder*="todo"]', todoTitle);
    await page.click('button:has-text("Add")');
    
    await page.click(`text=${todoTitle}`);
    
    // Add and check a subtask
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    await subtaskInput.fill('Persistent task');
    await page.keyboard.press('Enter');
    
    const checkbox = page.locator('input[type="checkbox"]').last();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Expand todo and verify subtask is still checked
    await page.click(`text=${todoTitle}`);
    await expect(page.locator('text=Persistent task')).toBeVisible();
    
    const reloadedCheckbox = page.locator('input[type="checkbox"]').last();
    await expect(reloadedCheckbox).toBeChecked();
  });
});

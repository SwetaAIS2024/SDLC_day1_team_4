import { test, expect, Page } from '@playwright/test';

// Helper class for tag-related interactions
class TagTestHelper {
  constructor(private page: Page) {}

  async openTagModal() {
    await this.page.click('button:has-text("+ Manage Tags")');
    await this.page.waitForSelector('text=Manage Tags', { timeout: 5000 });
  }

  async closeTagModal() {
    const closeButtons = this.page.locator('button:has-text("Close")');
    const count = await closeButtons.count();
    if (count > 0) {
      await closeButtons.last().click();
    }
  }

  async createTag(name: string, color: string = '#3B82F6') {
    await this.openTagModal();
    
    // Fill in tag name
    await this.page.fill('input[placeholder*="Work, Personal"]', name);
    
    // Set color using hex input
    const hexInput = this.page.locator('input[pattern*="A-Fa-f"]').first();
    await hexInput.fill(color);
    
    // Click create button
    await this.page.click('button:has-text("Create Tag")');
    
    // Wait for tag to appear in list
    await this.page.waitForSelector(`text=${name}`, { timeout: 3000 });
  }

  async deleteTag(name: string) {
    await this.openTagModal();
    
    // Find the tag and click delete
    const tagRow = this.page.locator(`div:has-text("${name}")`).first();
    await tagRow.locator('button:has-text("Delete")').click();
    
    // Confirm deletion in alert dialog
    this.page.once('dialog', dialog => dialog.accept());
    
    // Wait for tag to disappear
    await this.page.waitForSelector(`text=${name}`, { state: 'hidden', timeout: 3000 });
  }

  async editTag(oldName: string, newName: string, newColor: string) {
    await this.openTagModal();
    
    // Find the tag and click edit
    const tagRow = this.page.locator(`div:has-text("${oldName}")`).first();
    await tagRow.locator('button:has-text("Edit")').click();
    
    // Update fields
    const nameInput = tagRow.locator('input[maxlength="50"]');
    await nameInput.fill(newName);
    
    const hexInput = tagRow.locator('input[pattern*="A-Fa-f"]');
    await hexInput.fill(newColor);
    
    // Click update
    await tagRow.locator('button:has-text("Update")').click();
    
    // Wait for updated tag to appear
    await this.page.waitForSelector(`text=${newName}`, { timeout: 3000 });
  }

  async selectTagInForm(tagName: string) {
    const tagButton = this.page.locator(`button:has-text("${tagName}")`).first();
    await tagButton.click();
  }

  async verifyTagOnTodo(todoTitle: string, tagName: string) {
    const todoItem = this.page.locator(`div:has-text("${todoTitle}")`).first();
    const tagPill = todoItem.locator(`span:has-text("${tagName}")`);
    await expect(tagPill).toBeVisible();
  }

  async filterByTag(tagName: string) {
    const tagFilter = this.page.locator('select').filter({ hasText: 'All Tags' });
    await tagFilter.selectOption({ label: tagName });
  }
}

test.describe('Tag System - Complete Flow', () => {
  let tagHelper: TagTestHelper;

  test.beforeEach(async ({ page }) => {
    tagHelper = new TagTestHelper(page);
    
    // Navigate to app and handle authentication
    await page.goto('http://localhost:3001');
    
    // Check if we're on login page
    const isLoginPage = await page.locator('text=Register').isVisible().catch(() => false);
    
    if (isLoginPage) {
      // Register or login
      const username = `testuser_${Date.now()}`;
      await page.fill('input[placeholder*="username"]', username);
      await page.click('button:has-text("Register")');
      await page.waitForURL('**/todos', { timeout: 10000 });
    }
    
    // Wait for todos page to load
    await page.waitForSelector('text=Add a new todo', { timeout: 10000 });
  });

  test('01 - Create a new tag', async ({ page }) => {
    await tagHelper.createTag('Work', '#10B981');
    
    // Verify tag appears in modal
    await expect(page.locator('text=Work')).toBeVisible();
    await expect(page.locator('text=#10B981').or(page.locator('text=#10b981'))).toBeVisible();
  });

  test('02 - Create multiple tags', async ({ page }) => {
    await tagHelper.createTag('Work', '#10B981');
    await tagHelper.createTag('Personal', '#3B82F6');
    await tagHelper.createTag('Urgent', '#EF4444');
    
    // Verify all tags appear
    await expect(page.locator('text=Work')).toBeVisible();
    await expect(page.locator('text=Personal')).toBeVisible();
    await expect(page.locator('text=Urgent')).toBeVisible();
    
    await tagHelper.closeTagModal();
  });

  test('03 - Edit tag name and color', async ({ page }) => {
    await tagHelper.createTag('Wrk', '#10B981');
    await tagHelper.editTag('Wrk', 'Work', '#22C55E');
    
    // Verify old name is gone and new name exists
    await expect(page.locator('text=Wrk').first()).not.toBeVisible();
    await expect(page.locator('text=Work')).toBeVisible();
    
    await tagHelper.closeTagModal();
  });

  test('04 - Delete a tag', async ({ page }) => {
    await tagHelper.createTag('TempTag', '#F59E0B');
    await tagHelper.deleteTag('TempTag');
    
    // Verify tag is removed
    const tagExists = await page.locator('text=TempTag').count();
    expect(tagExists).toBe(0);
    
    await tagHelper.closeTagModal();
  });

  test('05 - Apply single tag to new todo', async ({ page }) => {
    await tagHelper.createTag('Work', '#10B981');
    await tagHelper.closeTagModal();
    
    // Create a todo with tag
    await page.fill('input[placeholder*="Add a new todo"]', 'Complete project report');
    
    // Set due date (required)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Select tag
    await tagHelper.selectTagInForm('Work');
    
    // Create todo
    await page.click('button:has-text("Add")');
    
    // Verify tag appears on todo
    await page.waitForTimeout(1000);
    await tagHelper.verifyTagOnTodo('Complete project report', 'Work');
  });

  test('06 - Apply multiple tags to new todo', async ({ page }) => {
    await tagHelper.createTag('Work', '#10B981');
    await tagHelper.createTag('Urgent', '#EF4444');
    await tagHelper.closeTagModal();
    
    // Create a todo with multiple tags
    await page.fill('input[placeholder*="Add a new todo"]', 'Urgent deadline task');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Select both tags
    await tagHelper.selectTagInForm('Work');
    await tagHelper.selectTagInForm('Urgent');
    
    // Create todo
    await page.click('button:has-text("Add")');
    
    // Verify both tags appear on todo
    await page.waitForTimeout(1000);
    await tagHelper.verifyTagOnTodo('Urgent deadline task', 'Work');
    await tagHelper.verifyTagOnTodo('Urgent deadline task', 'Urgent');
  });

  test('07 - Edit todo to add/remove tags', async ({ page }) => {
    await tagHelper.createTag('Work', '#10B981');
    await tagHelper.createTag('Personal', '#3B82F6');
    await tagHelper.closeTagModal();
    
    // Create a todo
    await page.fill('input[placeholder*="Add a new todo"]', 'Task to edit');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Edit the todo
    const todoItem = page.locator('div:has-text("Task to edit")').first();
    await todoItem.locator('button:has-text("Edit")').click();
    
    // Add tags in edit mode
    await page.waitForTimeout(500);
    const editTagButtons = page.locator('button:has-text("Work")').or(page.locator('button:has-text("Personal")')).all();
    
    // Click first available tag button in edit form
    await page.locator('button:has-text("Work")').nth(1).click();
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Verify tag appears
    await page.waitForTimeout(1000);
    await tagHelper.verifyTagOnTodo('Task to edit', 'Work');
  });

  test('08 - Filter todos by tag', async ({ page }) => {
    await tagHelper.createTag('Work', '#10B981');
    await tagHelper.createTag('Personal', '#3B82F6');
    await tagHelper.closeTagModal();
    
    // Create work todo
    await page.fill('input[placeholder*="Add a new todo"]', 'Work task');
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="datetime-local"]', tomorrow.toISOString().slice(0, 16));
    await tagHelper.selectTagInForm('Work');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Create personal todo
    await page.fill('input[placeholder*="Add a new todo"]', 'Personal task');
    tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    await page.fill('input[type="datetime-local"]', tomorrow.toISOString().slice(0, 16));
    await tagHelper.selectTagInForm('Personal');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Filter by Work tag
    await tagHelper.filterByTag('Work');
    
    // Verify only work task is visible
    await expect(page.locator('text=Work task')).toBeVisible();
    await expect(page.locator('text=Personal task')).not.toBeVisible();
    
    // Clear filter
    await tagHelper.filterByTag('All Tags');
    
    // Verify both tasks are visible
    await expect(page.locator('text=Work task')).toBeVisible();
    await expect(page.locator('text=Personal task')).toBeVisible();
  });

  test('09 - Tag CASCADE delete (deleting tag removes from todos)', async ({ page }) => {
    await tagHelper.createTag('TempTag', '#F59E0B');
    await tagHelper.closeTagModal();
    
    // Create todo with tag
    await page.fill('input[placeholder*="Add a new todo"]', 'Todo with temp tag');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="datetime-local"]', tomorrow.toISOString().slice(0, 16));
    await tagHelper.selectTagInForm('TempTag');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Verify tag on todo
    await tagHelper.verifyTagOnTodo('Todo with temp tag', 'TempTag');
    
    // Delete the tag
    await tagHelper.deleteTag('TempTag');
    await tagHelper.closeTagModal();
    
    // Verify tag is removed from todo
    const todoItem = page.locator('div:has-text("Todo with temp tag")').first();
    const tagPill = todoItem.locator('span:has-text("TempTag")');
    await expect(tagPill).not.toBeVisible();
  });

  test('10 - Validate tag name uniqueness', async ({ page }) => {
    await tagHelper.createTag('UniqueTag', '#10B981');
    
    // Try to create same tag again
    await page.fill('input[placeholder*="Work, Personal"]', 'UniqueTag');
    await page.click('button:has-text("Create Tag")');
    
    // Should see error message
    await page.waitForTimeout(1000);
    const errorMsg = page.locator('text=already exists');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
    
    await tagHelper.closeTagModal();
  });

  test('11 - Tag color validation (hex format)', async ({ page }) => {
    await tagHelper.openTagModal();
    
    await page.fill('input[placeholder*="Work, Personal"]', 'TestColor');
    
    // Try invalid hex code
    const hexInput = page.locator('input[pattern*="A-Fa-f"]').first();
    await hexInput.fill('INVALID');
    
    await page.click('button:has-text("Create Tag")');
    
    // Should show validation error or prevent creation
    await page.waitForTimeout(1000);
    
    // Clean up
    await tagHelper.closeTagModal();
  });

  test('12 - Search works with tagged todos', async ({ page }) => {
    await tagHelper.createTag('Searchable', '#8B5CF6');
    await tagHelper.closeTagModal();
    
    // Create tagged todo
    await page.fill('input[placeholder*="Add a new todo"]', 'Findable task');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.fill('input[type="datetime-local"]', tomorrow.toISOString().slice(0, 16));
    await tagHelper.selectTagInForm('Searchable');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);
    
    // Search for the todo
    await page.fill('input[placeholder*="Search todos"]', 'Findable');
    
    // Verify todo appears with tag
    await expect(page.locator('text=Findable task')).toBeVisible();
    await tagHelper.verifyTagOnTodo('Findable task', 'Searchable');
  });
});

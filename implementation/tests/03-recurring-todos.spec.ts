/**
 * Playwright E2E Tests for Recurring Todos Feature
 * 
 * Test file: tests/03-recurring-todos.spec.ts
 * 
 * These tests verify the complete recurring todos functionality
 * based on the acceptance criteria in PRP-03
 */

import { test, expect } from '@playwright/test';

// Assuming you have a TestHelpers class
// If not, you'll need to create these helper methods
class TestHelpers {
  constructor(private page: any) {}

  async setupAuthenticatedUser() {
    // Navigate to login and authenticate
    await this.page.goto('http://localhost:3000/login');
    
    // Register or login with WebAuthn
    // This will depend on your auth setup
    await this.page.fill('input[name="username"]', `test-user-${Date.now()}`);
    await this.page.click('button:has-text("Register")');
    
    // Wait for authentication to complete
    await this.page.waitForURL('http://localhost:3000/');
  }

  async createTodo(options: {
    title: string;
    dueDate?: string | null;
    priority?: 'low' | 'medium' | 'high';
    recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    tagIds?: number[];
  }): Promise<number> {
    // Open todo creation modal
    await this.page.click('button:has-text("Add Todo")');
    
    // Fill form
    await this.page.fill('input[name="title"]', options.title);
    
    if (options.dueDate) {
      await this.page.fill('input[name="due_date"]', options.dueDate);
    }
    
    if (options.priority) {
      await this.page.selectOption('select[name="priority"]', options.priority);
    }
    
    if (options.recurrencePattern !== undefined) {
      const value = options.recurrencePattern || 'none';
      await this.page.selectOption('select[name="recurrence_pattern"]', value);
    }
    
    // Submit
    await this.page.click('button:has-text("Save")');
    
    // Wait for todo to appear and get its ID
    await this.page.waitForSelector(`text=${options.title}`);
    
    // Extract ID from data attribute or API response
    // This is a simplified version - adapt to your implementation
    const todoElement = await this.page.locator(`text=${options.title}`).first();
    const todoId = await todoElement.getAttribute('data-todo-id');
    
    return parseInt(todoId || '1');
  }

  async addSubtask(todoId: number, subtaskTitle: string) {
    // Click todo to expand
    await this.page.click(`[data-todo-id="${todoId}"]`);
    
    // Add subtask
    await this.page.fill(`[data-todo-id="${todoId}"] input[placeholder*="subtask"]`, subtaskTitle);
    await this.page.press(`[data-todo-id="${todoId}"] input[placeholder*="subtask"]`, 'Enter');
  }

  async createTag(name: string, color: string): Promise<number> {
    // Open tag management
    await this.page.click('button:has-text("Manage Tags")');
    
    // Create tag
    await this.page.fill('input[name="tag_name"]', name);
    await this.page.fill('input[name="tag_color"]', color);
    await this.page.click('button:has-text("Add Tag")');
    
    // Get tag ID (simplified)
    return 1;
  }
}

test.describe('Recurring Todos', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupAuthenticatedUser();
  });

  test('should create daily recurring todo', async ({ page }) => {
    await helpers.createTodo({
      title: 'Daily standup',
      dueDate: '2025-11-13T09:00',
      recurrencePattern: 'daily',
      priority: 'high'
    });

    // Verify recurrence icon displayed
    const todoItem = page.locator('text=Daily standup').locator('..');
    await expect(todoItem.locator('[title*="Repeats daily"]')).toBeVisible();
  });

  test('should create next instance when completing recurring todo', async ({ page }) => {
    // Create recurring todo
    const todoId = await helpers.createTodo({
      title: 'Weekly report',
      dueDate: '2025-11-15T17:00',
      recurrencePattern: 'weekly'
    });

    // Complete it
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();

    // Wait for success message with next date
    await expect(page.locator('text=/Next instance scheduled for.*2025-11-22/i')).toBeVisible({ timeout: 3000 });

    // Verify new instance exists (uncompleted)
    const newInstance = page.locator('text=Weekly report').first();
    await expect(newInstance).toBeVisible();
    
    // Verify it's not checked
    const checkbox = newInstance.locator('..').locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();
  });

  test('should inherit priority and tags to next instance', async ({ page }) => {
    // Create tag
    const tagId = await helpers.createTag('Work', '#3b82f6');

    // Create recurring todo with tag and priority
    const todoId = await helpers.createTodo({
      title: 'Team meeting',
      dueDate: '2025-11-13T14:00',
      recurrencePattern: 'weekly',
      priority: 'high',
      tagIds: [tagId]
    });

    // Complete it
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();

    // Wait for next instance
    await page.waitForTimeout(1000);

    // Verify next instance has high priority badge
    const nextTodo = page.locator('text=Team meeting').first().locator('..');
    await expect(nextTodo.locator('text=High')).toBeVisible();

    // Verify next instance has Work tag
    await expect(nextTodo.locator('text=Work')).toBeVisible();
  });

  test('should inherit subtasks to next instance', async ({ page }) => {
    // Create recurring todo
    const todoId = await helpers.createTodo({
      title: 'Morning routine',
      recurrencePattern: 'daily'
    });

    // Add subtasks
    await helpers.addSubtask(todoId, 'Exercise');
    await helpers.addSubtask(todoId, 'Meditate');

    // Complete todo
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();

    // Wait for next instance
    await page.waitForTimeout(1000);

    // Click to expand next instance subtasks
    await page.locator('text=Morning routine').first().click();

    // Verify subtasks exist
    await expect(page.locator('text=Exercise')).toBeVisible();
    await expect(page.locator('text=Meditate')).toBeVisible();
    
    // Verify subtasks are NOT checked (uncompleted)
    const exerciseCheckbox = page.locator('text=Exercise').locator('..').locator('input[type="checkbox"]');
    await expect(exerciseCheckbox).not.toBeChecked();
  });

  test('should calculate monthly recurrence correctly', async ({ page }) => {
    // Create monthly recurring todo due Jan 15
    await helpers.createTodo({
      title: 'Monthly review',
      dueDate: '2025-01-15T10:00',
      recurrencePattern: 'monthly'
    });

    // Complete it
    await page.locator('text=Monthly review').locator('..').locator('input[type="checkbox"]').check();

    // Verify next instance due Feb 15
    await expect(page.locator('text=/Next instance scheduled for.*2025-02-15/i')).toBeVisible();
  });

  test('should handle yearly recurrence', async ({ page }) => {
    await helpers.createTodo({
      title: 'Annual review',
      dueDate: '2025-12-31T23:59',
      recurrencePattern: 'yearly'
    });

    await page.locator('text=Annual review').locator('..').locator('input[type="checkbox"]').check();

    // Next instance should be 2026-12-31
    await expect(page.locator('text=/Next instance scheduled for.*2026-12-31/i')).toBeVisible();
  });

  test('should allow editing recurrence pattern', async ({ page }) => {
    const todoId = await helpers.createTodo({
      title: 'Flexible task',
      recurrencePattern: 'daily'
    });

    // Open edit modal
    await page.locator(`[data-todo-id="${todoId}"]`).locator('button:has-text("Edit")').click();
    
    // Change to weekly
    await page.selectOption('select[name="recurrence_pattern"]', 'weekly');
    await page.click('button:has-text("Save")');

    // Verify icon changed
    await expect(page.locator('text=Flexible task').locator('..').locator('[title*="Repeats weekly"]')).toBeVisible();
  });

  test('should allow removing recurrence', async ({ page }) => {
    const todoId = await helpers.createTodo({
      title: 'One-time task now',
      recurrencePattern: 'daily'
    });

    // Edit and remove recurrence
    await page.locator(`[data-todo-id="${todoId}"]`).locator('button:has-text("Edit")').click();
    await page.selectOption('select[name="recurrence_pattern"]', 'none');
    await page.click('button:has-text("Save")');

    // Verify recurrence icon removed
    await expect(page.locator('text=One-time task now').locator('..').locator('[title^="Repeats"]')).not.toBeVisible();
  });

  test('should handle completion without due date', async ({ page }) => {
    await helpers.createTodo({
      title: 'Anytime task',
      recurrencePattern: 'daily',
      dueDate: null
    });

    await page.locator('text=Anytime task').locator('..').locator('input[type="checkbox"]').check();

    // Should still create next instance (due date calculated from now)
    await expect(page.locator('text=/Next instance scheduled/i')).toBeVisible();
  });

  test('should handle weekly recurrence pattern correctly', async ({ page }) => {
    // Create weekly recurring todo
    await helpers.createTodo({
      title: 'Weekly task',
      dueDate: '2025-11-13T10:00',
      recurrencePattern: 'weekly'
    });

    // Complete it
    await page.locator('text=Weekly task').locator('..').locator('input[type="checkbox"]').check();

    // Verify next instance is exactly 7 days later (Nov 20)
    await expect(page.locator('text=/Next instance scheduled for.*2025-11-20/i')).toBeVisible();
  });

  test('should delete only current recurring instance', async ({ page }) => {
    // Create and complete recurring todo to have multiple instances
    const todoId = await helpers.createTodo({
      title: 'Deletable recurring',
      recurrencePattern: 'daily'
    });

    // Complete to create next instance
    await page.locator(`[data-todo-id="${todoId}"] input[type="checkbox"]`).check();
    await page.waitForTimeout(500);

    // Count instances before deletion
    const countBefore = await page.locator('text=Deletable recurring').count();
    expect(countBefore).toBeGreaterThanOrEqual(1);

    // Delete the active (uncompleted) instance
    const activeTodo = page.locator('text=Deletable recurring').first();
    await activeTodo.locator('..').locator('button:has-text("Delete")').click();
    
    // Confirm deletion if there's a modal
    const confirmButton = page.locator('button:has-text("Confirm")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Wait for deletion
    await page.waitForTimeout(500);

    // Verify message about single instance deletion
    await expect(page.locator('text=/instance deleted/i')).toBeVisible();
  });

  test('should show correct recurrence icons for all patterns', async ({ page }) => {
    // Create todos with different patterns
    await helpers.createTodo({ title: 'Daily task', recurrencePattern: 'daily' });
    await helpers.createTodo({ title: 'Weekly task', recurrencePattern: 'weekly' });
    await helpers.createTodo({ title: 'Monthly task', recurrencePattern: 'monthly' });
    await helpers.createTodo({ title: 'Yearly task', recurrencePattern: 'yearly' });

    // Verify each has correct icon/label
    await expect(page.locator('text=Daily task').locator('..').locator('[title*="daily"]')).toBeVisible();
    await expect(page.locator('text=Weekly task').locator('..').locator('[title*="weekly"]')).toBeVisible();
    await expect(page.locator('text=Monthly task').locator('..').locator('[title*="monthly"]')).toBeVisible();
    await expect(page.locator('text=Yearly task').locator('..').locator('[title*="yearly"]')).toBeVisible();
  });

  test('should maintain reminder offset in next instance', async ({ page }) => {
    // Create recurring todo with reminder
    await helpers.createTodo({
      title: 'Task with reminder',
      dueDate: '2025-11-15T10:00',
      recurrencePattern: 'daily'
    });

    // Set reminder (this depends on your UI implementation)
    // Simplified version:
    await page.locator('text=Task with reminder').locator('..').locator('button:has-text("Edit")').click();
    await page.selectOption('select[name="reminder_minutes"]', '30');
    await page.click('button:has-text("Save")');

    // Complete todo
    await page.locator('text=Task with reminder').locator('..').locator('input[type="checkbox"]').check();
    await page.waitForTimeout(500);

    // Edit next instance and verify reminder is still 30 minutes
    await page.locator('text=Task with reminder').first().locator('..').locator('button:has-text("Edit")').click();
    
    const reminderValue = await page.locator('select[name="reminder_minutes"]').inputValue();
    expect(reminderValue).toBe('30');
  });
});

/**
 * Additional integration tests for edge cases
 */
test.describe('Recurring Todos - Edge Cases', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupAuthenticatedUser();
  });

  test('should handle month overflow (Jan 31 to Feb 28/29)', async ({ page }) => {
    // Create monthly recurring todo on Jan 31
    await helpers.createTodo({
      title: 'End of month task',
      dueDate: '2025-01-31T10:00',
      recurrencePattern: 'monthly'
    });

    // Complete it
    await page.locator('text=End of month task').locator('..').locator('input[type="checkbox"]').check();

    // Next instance should be adjusted to Feb 28 (2025 is not a leap year)
    await expect(page.locator('text=/Next instance scheduled for.*2025-02-28/i')).toBeVisible();
  });

  test('should prevent schedule drift (complete before due date)', async ({ page }) => {
    // Create weekly recurring todo due Friday
    await helpers.createTodo({
      title: 'Friday task',
      dueDate: '2025-11-15T17:00', // Friday
      recurrencePattern: 'weekly'
    });

    // Complete early on Tuesday
    await page.locator('text=Friday task').locator('..').locator('input[type="checkbox"]').check();

    // Next instance should still be due the following Friday (Nov 22), not 7 days from completion
    await expect(page.locator('text=/Next instance scheduled for.*2025-11-22/i')).toBeVisible();
  });

  test('should display warning for monthly recurrence on day 29-31', async ({ page }) => {
    // Open todo creation
    await page.click('button:has-text("Add Todo")');
    
    // Set due date to Jan 31
    await page.fill('input[name="due_date"]', '2025-01-31T10:00');
    
    // Select monthly recurrence
    await page.selectOption('select[name="recurrence_pattern"]', 'monthly');
    
    // Verify warning message appears
    await expect(page.locator('text=/may be adjusted to last day of month/i')).toBeVisible();
  });
});

/**
 * Performance tests
 */
test.describe('Recurring Todos - Performance', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.setupAuthenticatedUser();
  });

  test('should handle rapid completions', async ({ page }) => {
    // Create daily recurring todo
    await helpers.createTodo({
      title: 'Rapid completion test',
      recurrencePattern: 'daily'
    });

    // Complete it 3 times rapidly
    for (let i = 0; i < 3; i++) {
      await page.locator('text=Rapid completion test').first().locator('..').locator('input[type="checkbox"]').check();
      await page.waitForTimeout(500);
    }

    // Verify 3 instances were created (should have 1 active after 3 completions)
    const activeCount = await page.locator('text=Rapid completion test').count();
    expect(activeCount).toBe(1);
  });
});

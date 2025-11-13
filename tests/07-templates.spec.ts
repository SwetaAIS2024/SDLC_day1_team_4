import { test, expect } from '@playwright/test';

/**
 * Tests for PRP-07: Todo Templates
 * Covers creating templates, using templates to generate todos, and template management
 */

test.describe('Todo Templates', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `templatetest_${Date.now()}`;
    
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

  test('should show templates section', async ({ page }) => {
    // Look for templates section
    const templatesSection = page.locator('text=/Templates?/i, button:has-text("Templates"), .templates');
    await expect(templatesSection.first()).toBeVisible({ timeout: 5000 });
  });

  test('should create a new template', async ({ page }) => {
    // Click to create template
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    // Fill template details
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Weekly Review');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Weekly review: {{date}}');
    
    // Set due date offset (e.g., 7 days)
    const offsetInput = page.locator('input[type="number"]').first();
    if (await offsetInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await offsetInput.fill('7');
    }
    
    // Save template
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Verify template appears
    await expect(page.locator('text=Weekly Review')).toBeVisible();
  });

  test('should create template with subtasks', async ({ page }) => {
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Project Starter');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'New project setup');
    
    // Add subtasks to template
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    if (await subtaskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtaskInput.fill('Create repository');
      await page.keyboard.press('Enter');
      await subtaskInput.fill('Setup environment');
      await page.keyboard.press('Enter');
      await subtaskInput.fill('Initial commit');
      await page.keyboard.press('Enter');
    }
    
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    await expect(page.locator('text=Project Starter')).toBeVisible();
  });

  test('should use template to create todo', async ({ page }) => {
    // Create template first
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Quick Meeting');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Team meeting prep');
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Use the template
    const useButton = page.locator('button:has-text("Use"), button:has-text("Apply")').first();
    await useButton.click();
    
    // Should create a todo from template
    await expect(page.locator('text=Team meeting prep')).toBeVisible();
  });

  test('should apply template with due date offset', async ({ page }) => {
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Future Task');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Task due in future');
    
    // Set offset to 3 days
    const offsetInput = page.locator('input[type="number"], input[name*="offset" i]').first();
    if (await offsetInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await offsetInput.fill('3');
    }
    
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Use template
    const useButton = page.locator('button:has-text("Use"), button:has-text("Apply")').first();
    await useButton.click();
    
    // Todo should have due date 3 days from now
    await expect(page.locator('text=Task due in future')).toBeVisible();
    
    // Check for due date indicator
    const today = new Date();
    const futureDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const dayStr = futureDate.getDate().toString();
    
    await expect(page.locator(`text=/${dayStr}/`)).toBeVisible();
  });

  test('should edit template', async ({ page }) => {
    // Create template
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Original Template');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Original task');
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Edit template
    const editButton = page.locator('button:has-text("Edit")').last();
    await editButton.click();
    
    await page.fill('input[value*="Original Template"]', 'Updated Template');
    await page.click('button:has-text("Save")');
    
    // Verify update
    await expect(page.locator('text=Updated Template')).toBeVisible();
    await expect(page.locator('text=Original Template')).not.toBeVisible();
  });

  test('should delete template', async ({ page }) => {
    // Create template
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Template to Delete');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Delete me');
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    await expect(page.locator('text=Template to Delete')).toBeVisible();
    
    // Delete template
    const deleteButton = page.locator('button:has-text("Delete"), button:has-text("×")').last();
    await deleteButton.click();
    
    // Confirm if needed
    const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
    if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmButton.click();
    }
    
    await expect(page.locator('text=Template to Delete')).not.toBeVisible();
  });

  test('should template preserve priority and recurrence', async ({ page }) => {
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Complex Template');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'High priority recurring task');
    
    // Set priority to high
    const prioritySelect = page.locator('select').first();
    if (await prioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prioritySelect.selectOption('high');
    }
    
    // Set recurrence
    const recurrenceSelect = page.locator('select').nth(1);
    if (await recurrenceSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recurrenceSelect.selectOption('weekly');
    }
    
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Use template
    const useButton = page.locator('button:has-text("Use"), button:has-text("Apply")').first();
    await useButton.click();
    
    // Verify todo has high priority and weekly recurrence
    await expect(page.locator('text=High priority recurring task')).toBeVisible();
    await expect(page.locator('.priority-high, .badge-red')).toBeVisible();
    await expect(page.locator('text=/🔄|weekly/i')).toBeVisible();
  });

  test('should show list of all templates', async ({ page }) => {
    // Create multiple templates
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    
    // Template 1
    await newTemplateButton.click();
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Template A');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Task A');
    await page.click('button:has-text("Save"), button:has-text("Create")');
    await page.waitForTimeout(500);
    
    // Template 2
    await newTemplateButton.click();
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Template B');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Task B');
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Both should be visible
    await expect(page.locator('text=Template A')).toBeVisible();
    await expect(page.locator('text=Template B')).toBeVisible();
  });

  test('should template include tags', async ({ page }) => {
    // Create a tag first (if tag system exists)
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag")').first();
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Template Tag');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
    }
    
    // Create template with tag
    const newTemplateButton = page.locator('button:has-text("New Template"), button:has-text("Create Template"), button:has-text("Add Template")').first();
    await newTemplateButton.click();
    
    await page.fill('input[placeholder*="template name" i], input[placeholder*="name" i]', 'Tagged Template');
    await page.fill('input[placeholder*="title" i], textarea[placeholder*="title" i]', 'Task with tag');
    
    // Select tag
    const tagCheckbox = page.locator('text=Template Tag').first();
    if (await tagCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tagCheckbox.click();
    }
    
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Use template
    const useButton = page.locator('button:has-text("Use"), button:has-text("Apply")').first();
    await useButton.click();
    
    // Todo should have the tag
    await expect(page.locator('text=Task with tag')).toBeVisible();
  });
});

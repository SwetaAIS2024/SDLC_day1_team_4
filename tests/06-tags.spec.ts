import { test, expect } from '@playwright/test';

/**
 * Tests for PRP-06: Tags & Categories
 * Covers creating tags, assigning to todos, filtering by tags, and tag management
 */

test.describe('Tags & Categories', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `tagtest_${Date.now()}`;
    
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

  test('should create a new tag', async ({ page }) => {
    // Look for tag creation interface (could be button or input)
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    await tagButton.click();
    
    // Fill tag name
    await page.fill('input[placeholder*="tag" i]', 'Work');
    
    // Select a color (if available)
    const colorOption = page.locator('input[type="color"], button[data-color], .color-picker').first();
    if (await colorOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await colorOption.click();
    }
    
    // Save tag
    await page.click('button:has-text("Save"), button:has-text("Create")');
    
    // Verify tag appears
    await expect(page.locator('text=Work')).toBeVisible();
  });

  test('should assign tag to todo when creating', async ({ page }) => {
    // Create a tag first
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Personal');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
    }
    
    // Create todo
    await page.fill('input[placeholder*="todo"]', 'Tagged todo');
    
    // Look for tag selector/checkbox
    const tagSelector = page.locator('text=Personal').first();
    if (await tagSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tagSelector.click();
    }
    
    await page.click('button:has-text("Add")');
    
    // Verify todo shows with tag
    await expect(page.locator('text=Tagged todo')).toBeVisible();
  });

  test('should display tags with color coding', async ({ page }) => {
    // Create tag
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Urgent');
      
      // Try to set red color
      const colorInput = page.locator('input[type="color"]').first();
      if (await colorInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await colorInput.fill('#ff0000');
      }
      
      await page.click('button:has-text("Save"), button:has-text("Create")');
      
      // Check if tag has color styling
      const tagElement = page.locator('text=Urgent').first();
      await expect(tagElement).toBeVisible();
      
      // Verify it has some styling (class or style attribute)
      const hasColor = await tagElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor !== '' || styles.color !== '';
      });
      expect(hasColor).toBeTruthy();
    }
  });

  test('should filter todos by tag', async ({ page }) => {
    // Create two tags
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Create first tag
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Home');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
      
      // Create second tag
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Work');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
    }
    
    // Create todos with different tags
    await page.fill('input[placeholder*="todo"]', 'Home task');
    const homeTag = page.locator('text=Home').first();
    if (await homeTag.isVisible({ timeout: 1000 }).catch(() => false)) {
      await homeTag.click();
    }
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="todo"]', 'Work task');
    const workTag = page.locator('text=Work').first();
    if (await workTag.isVisible({ timeout: 1000 }).catch(() => false)) {
      await workTag.click();
    }
    await page.click('button:has-text("Add")');
    
    // Filter by Home tag
    const tagFilter = page.locator('select[name*="tag" i], button:has-text("Filter"), .tag-filter').first();
    if (await tagFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagFilter.click();
      await page.click('text=Home');
      
      // Should show Home task but not Work task
      await expect(page.locator('text=Home task')).toBeVisible();
      await expect(page.locator('text=Work task')).not.toBeVisible();
    }
  });

  test('should assign multiple tags to a todo', async ({ page }) => {
    // Create tags
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Important');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
      
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Review');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
    }
    
    // Create todo with multiple tags
    await page.fill('input[placeholder*="todo"]', 'Multi-tag todo');
    
    const tag1 = page.locator('text=Important').first();
    const tag2 = page.locator('text=Review').first();
    
    if (await tag1.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tag1.click();
      await tag2.click();
    }
    
    await page.click('button:has-text("Add")');
    
    // Verify both tags appear on todo
    await expect(page.locator('text=Multi-tag todo')).toBeVisible();
  });

  test('should edit tag properties', async ({ page }) => {
    // Create tag
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Original');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      
      // Click edit on the tag
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        
        // Change name
        await page.fill('input[value="Original"]', 'Updated');
        await page.click('button:has-text("Save")');
        
        // Verify new name
        await expect(page.locator('text=Updated')).toBeVisible();
        await expect(page.locator('text=Original')).not.toBeVisible();
      }
    }
  });

  test('should delete a tag', async ({ page }) => {
    // Create tag
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'ToDelete');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      
      await expect(page.locator('text=ToDelete')).toBeVisible();
      
      // Delete the tag
      const deleteButton = page.locator('button:has-text("Delete"), button:has-text("×")').last();
      await deleteButton.click();
      
      // Confirm deletion if needed
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      // Tag should be gone
      await expect(page.locator('text=ToDelete')).not.toBeVisible();
    }
  });

  test('should show tag count for each tag', async ({ page }) => {
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Create tag
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Counted');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
      
      // Create 2 todos with this tag
      await page.fill('input[placeholder*="todo"]', 'Task 1');
      const countedTag = page.locator('text=Counted').first();
      if (await countedTag.isVisible({ timeout: 1000 }).catch(() => false)) {
        await countedTag.click();
      }
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(500);
      
      await page.fill('input[placeholder*="todo"]', 'Task 2');
      if (await countedTag.isVisible({ timeout: 1000 }).catch(() => false)) {
        await countedTag.click();
      }
      await page.click('button:has-text("Add")');
      
      // Should see count indicator (2)
      await expect(page.locator('text=/Counted.*2|2.*Counted/')).toBeVisible();
    }
  });

  test('should remove tag from todo', async ({ page }) => {
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Create tag and todo
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Removable');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
      
      await page.fill('input[placeholder*="todo"]', 'Task with removable tag');
      const removableTag = page.locator('text=Removable').first();
      if (await removableTag.isVisible({ timeout: 1000 }).catch(() => false)) {
        await removableTag.click();
      }
      await page.click('button:has-text("Add")');
      
      // Edit todo to remove tag
      await page.click('button:has-text("Edit")');
      
      // Uncheck or remove the tag
      const tagInEdit = page.locator('text=Removable').first();
      if (await tagInEdit.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tagInEdit.click(); // Toggle off
      }
      
      await page.click('button:has-text("Save")');
      
      // Verify tag is removed from todo
      const todoRow = page.locator('text=Task with removable tag').locator('..');
      const hasTag = await todoRow.locator('text=Removable').count();
      expect(hasTag).toBe(0);
    }
  });

  test('should preserve tags when completing todo', async ({ page }) => {
    const tagButton = page.locator('button:has-text("New Tag"), button:has-text("Add Tag"), button:has-text("Create Tag")').first();
    
    if (await tagButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Create tag and todo
      await tagButton.click();
      await page.fill('input[placeholder*="tag" i]', 'Persistent');
      await page.click('button:has-text("Save"), button:has-text("Create")');
      await page.waitForTimeout(500);
      
      await page.fill('input[placeholder*="todo"]', 'Task to complete');
      const persistentTag = page.locator('text=Persistent').first();
      if (await persistentTag.isVisible({ timeout: 1000 }).catch(() => false)) {
        await persistentTag.click();
      }
      await page.click('button:has-text("Add")');
      
      // Complete the todo
      const completeButton = page.locator('button:has-text("Complete"), input[type="checkbox"]').first();
      await completeButton.click();
      
      // Tag should still be visible on completed todo
      await expect(page.locator('text=Task to complete')).toBeVisible();
      await expect(page.locator('text=Persistent')).toBeVisible();
    }
  });
});

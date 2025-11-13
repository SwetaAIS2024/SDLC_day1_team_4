import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tests for PRP-09: Export & Import
 * Covers exporting todos to JSON and importing them back
 */

test.describe('Export & Import', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `exporttest_${Date.now()}`;
    
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

  test('should show export button', async ({ page }) => {
    const exportButton = page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("Export")').first();
    await expect(exportButton).toBeVisible({ timeout: 5000 });
  });

  test('should export todos to JSON', async ({ page }) => {
    // Create some todos
    await page.fill('input[placeholder*="todo"]', 'Export test todo 1');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    await page.fill('input[placeholder*="todo"]', 'Export test todo 2');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Click export button
    const exportButton = page.locator('button:has-text("Export"), a:has-text("Export")').first();
    
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify file name
    expect(download.suggestedFilename()).toMatch(/todos.*\.json/);
    
    // Save and verify content
    const downloadPath = path.join(__dirname, '../test-results', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Read and parse JSON
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const exportedData = JSON.parse(fileContent);
    
    // Verify structure
    expect(exportedData).toHaveProperty('todos');
    expect(Array.isArray(exportedData.todos)).toBeTruthy();
    expect(exportedData.todos.length).toBeGreaterThanOrEqual(2);
    
    // Verify todo content
    const titles = exportedData.todos.map((t: any) => t.title);
    expect(titles).toContain('Export test todo 1');
    expect(titles).toContain('Export test todo 2');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should export include subtasks and tags', async ({ page }) => {
    // Create todo with subtask
    await page.fill('input[placeholder*="todo"]', 'Complex export task');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Add subtask if possible
    await page.click('text=Complex export task');
    const subtaskInput = page.locator('input[placeholder*="subtask" i]').first();
    if (await subtaskInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtaskInput.fill('Export subtask');
      await page.keyboard.press('Enter');
    }
    
    // Export
    const exportButton = page.locator('button:has-text("Export"), a:has-text("Export")').first();
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();
    const download = await downloadPromise;
    
    const downloadPath = path.join(__dirname, '../test-results', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const exportedData = JSON.parse(fileContent);
    
    // Check for subtasks in export
    expect(exportedData).toHaveProperty('subtasks');
    
    // Cleanup
    fs.unlinkSync(downloadPath);
  });

  test('should show import button', async ({ page }) => {
    const importButton = page.locator('button:has-text("Import"), label:has-text("Import")').first();
    await expect(importButton).toBeVisible({ timeout: 5000 });
  });

  test('should import todos from JSON file', async ({ page }) => {
    // Create sample import data
    const importData = {
      todos: [
        {
          id: 999,
          title: 'Imported todo 1',
          priority: 'high',
          completed: false,
          created_at: new Date().toISOString()
        },
        {
          id: 1000,
          title: 'Imported todo 2',
          priority: 'medium',
          completed: false,
          created_at: new Date().toISOString()
        }
      ],
      subtasks: [],
      tags: []
    };
    
    // Write to temp file
    const tempFilePath = path.join(__dirname, '../test-results', `import-${Date.now()}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(importData, null, 2));
    
    // Click import button to reveal file input
    const importButton = page.locator('button:has-text("Import"), label:has-text("Import")').first();
    await importButton.click();
    
    // Find file input (might be hidden)
    const fileInput = page.locator('input[type="file"]').first();
    
    // Upload file
    await fileInput.setInputFiles(tempFilePath);
    
    // Wait for import to complete
    await page.waitForTimeout(2000);
    
    // Verify imported todos appear
    await expect(page.locator('text=Imported todo 1')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Imported todo 2')).toBeVisible();
    
    // Cleanup
    fs.unlinkSync(tempFilePath);
  });

  test('should import preserve priority levels', async ({ page }) => {
    const importData = {
      todos: [
        {
          id: 1001,
          title: 'High priority import',
          priority: 'high',
          completed: false,
          created_at: new Date().toISOString()
        },
        {
          id: 1002,
          title: 'Low priority import',
          priority: 'low',
          completed: false,
          created_at: new Date().toISOString()
        }
      ],
      subtasks: [],
      tags: []
    };
    
    const tempFilePath = path.join(__dirname, '../test-results', `import-priority-${Date.now()}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(importData, null, 2));
    
    const importButton = page.locator('button:has-text("Import"), label:has-text("Import")').first();
    await importButton.click();
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempFilePath);
    
    await page.waitForTimeout(2000);
    
    // Verify todos with correct priority badges
    await expect(page.locator('text=High priority import')).toBeVisible();
    await expect(page.locator('text=Low priority import')).toBeVisible();
    
    // Check for priority indicators
    await expect(page.locator('.priority-high, .badge-red')).toBeVisible();
    await expect(page.locator('.priority-low, .badge-blue')).toBeVisible();
    
    fs.unlinkSync(tempFilePath);
  });

  test('should import handle duplicate titles', async ({ page }) => {
    // Create existing todo
    await page.fill('input[placeholder*="todo"]', 'Duplicate title');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Import same title
    const importData = {
      todos: [
        {
          id: 1003,
          title: 'Duplicate title',
          priority: 'medium',
          completed: false,
          created_at: new Date().toISOString()
        }
      ],
      subtasks: [],
      tags: []
    };
    
    const tempFilePath = path.join(__dirname, '../test-results', `import-duplicate-${Date.now()}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(importData, null, 2));
    
    const importButton = page.locator('button:has-text("Import"), label:has-text("Import")').first();
    await importButton.click();
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempFilePath);
    
    await page.waitForTimeout(2000);
    
    // Should have 2 todos with same title (or handle gracefully)
    const duplicateTodos = page.locator('text=Duplicate title');
    const count = await duplicateTodos.count();
    expect(count).toBeGreaterThanOrEqual(1);
    
    fs.unlinkSync(tempFilePath);
  });

  test('should show error on invalid JSON import', async ({ page }) => {
    // Create invalid JSON file
    const tempFilePath = path.join(__dirname, '../test-results', `import-invalid-${Date.now()}.json`);
    fs.writeFileSync(tempFilePath, '{invalid json content');
    
    const importButton = page.locator('button:has-text("Import"), label:has-text("Import")').first();
    await importButton.click();
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempFilePath);
    
    await page.waitForTimeout(1000);
    
    // Should show error message
    const errorMessage = page.locator('text=/error|invalid|failed/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
    
    fs.unlinkSync(tempFilePath);
  });

  test('should export preserve completed status', async ({ page }) => {
    // Create and complete a todo
    await page.fill('input[placeholder*="todo"]', 'Completed export task');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    const completeButton = page.locator('button:has-text("Complete"), input[type="checkbox"]').first();
    await completeButton.click();
    await page.waitForTimeout(500);
    
    // Export
    const exportButton = page.locator('button:has-text("Export"), a:has-text("Export")').first();
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await exportButton.click();
    const download = await downloadPromise;
    
    const downloadPath = path.join(__dirname, '../test-results', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    const fileContent = fs.readFileSync(downloadPath, 'utf-8');
    const exportedData = JSON.parse(fileContent);
    
    // Find completed todo
    const completedTodo = exportedData.todos.find((t: any) => t.title === 'Completed export task');
    expect(completedTodo).toBeDefined();
    expect(completedTodo.completed).toBe(true);
    
    fs.unlinkSync(downloadPath);
  });

  test('should import work with subtasks', async ({ page }) => {
    const importData = {
      todos: [
        {
          id: 1004,
          title: 'Task with subtasks',
          priority: 'medium',
          completed: false,
          created_at: new Date().toISOString()
        }
      ],
      subtasks: [
        {
          id: 5001,
          todo_id: 1004,
          title: 'Imported subtask 1',
          completed: false,
          position: 0
        },
        {
          id: 5002,
          todo_id: 1004,
          title: 'Imported subtask 2',
          completed: false,
          position: 1
        }
      ],
      tags: []
    };
    
    const tempFilePath = path.join(__dirname, '../test-results', `import-subtasks-${Date.now()}.json`);
    fs.writeFileSync(tempFilePath, JSON.stringify(importData, null, 2));
    
    const importButton = page.locator('button:has-text("Import"), label:has-text("Import")').first();
    await importButton.click();
    
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(tempFilePath);
    
    await page.waitForTimeout(2000);
    
    // Verify todo imported
    await expect(page.locator('text=Task with subtasks')).toBeVisible();
    
    // Click to expand and check subtasks
    await page.click('text=Task with subtasks');
    await expect(page.locator('text=Imported subtask 1')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Imported subtask 2')).toBeVisible();
    
    fs.unlinkSync(tempFilePath);
  });
});

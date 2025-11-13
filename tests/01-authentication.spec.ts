import { test, expect, Page } from '@playwright/test';

/**
 * Test Suite: Authentication (WebAuthn/Passkeys)
 * Tests PRP-01: Passwordless authentication flow
 */

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable virtual authenticator for WebAuthn testing
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
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('should redirect to login when not authenticated', async () => {
    await page.goto('http://localhost:3000');
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should show registration form for new users', async () => {
    await page.goto('http://localhost:3000/login');
    
    // Should see username input
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    
    // Should see register button
    await expect(page.locator('button:has-text("Register")')).toBeVisible();
  });

  test('should register a new user with WebAuthn', async () => {
    await page.goto('http://localhost:3000/login');
    
    // Fill in username
    const username = `testuser_${Date.now()}`;
    await page.fill('input[type="text"]', username);
    
    // Click register button
    await page.click('button:has-text("Register")');
    
    // Wait for WebAuthn ceremony (virtual authenticator will auto-respond)
    await page.waitForTimeout(1000);
    
    // Should redirect to todos page after successful registration
    await page.waitForURL('**/todos', { timeout: 5000 });
    expect(page.url()).toContain('/todos');
  });

  test('should login existing user with WebAuthn', async () => {
    // First register a user
    await page.goto('http://localhost:3000/login');
    const username = `logintest_${Date.now()}`;
    await page.fill('input[type="text"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('**/todos', { timeout: 5000 });
    
    // Logout (by clearing cookies)
    await page.context().clearCookies();
    
    // Go back to login
    await page.goto('http://localhost:3000/login');
    
    // Fill in same username
    await page.fill('input[type="text"]', username);
    
    // Click login button
    await page.click('button:has-text("Login")');
    
    // Wait for WebAuthn ceremony
    await page.waitForTimeout(1000);
    
    // Should redirect to todos page
    await page.waitForURL('**/todos', { timeout: 5000 });
    expect(page.url()).toContain('/todos');
  });

  test('should show username in todos page after login', async () => {
    await page.goto('http://localhost:3000/login');
    const username = `displaytest_${Date.now()}`;
    await page.fill('input[type="text"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('**/todos', { timeout: 5000 });
    
    // Should show username somewhere on the page
    await expect(page.locator(`text=${username}`)).toBeVisible({ timeout: 5000 });
  });

  test('should have logout functionality', async () => {
    await page.goto('http://localhost:3000/login');
    const username = `logouttest_${Date.now()}`;
    await page.fill('input[type="text"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('**/todos', { timeout: 5000 });
    
    // Look for logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
    
    // Click logout
    await logoutButton.click();
    
    // Should redirect to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });

  test('should persist session across page reloads', async () => {
    await page.goto('http://localhost:3000/login');
    const username = `persisttest_${Date.now()}`;
    await page.fill('input[type="text"]', username);
    await page.click('button:has-text("Register")');
    await page.waitForURL('**/todos', { timeout: 5000 });
    
    // Reload the page
    await page.reload();
    
    // Should still be on todos page (not redirected to login)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/todos');
    await expect(page.locator(`text=${username}`)).toBeVisible();
  });
});

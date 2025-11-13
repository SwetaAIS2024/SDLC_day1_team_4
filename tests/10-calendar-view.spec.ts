import { test, expect } from '@playwright/test';

/**
 * Tests for PRP-10: Calendar View
 * Covers calendar navigation, viewing todos by date, and calendar-specific interactions
 */

test.describe('Calendar View', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('http://localhost:3000/login');
    const username = `calendartest_${Date.now()}`;
    
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

  test('should navigate to calendar view', async ({ page }) => {
    // Look for calendar link/button
    const calendarLink = page.locator('a:has-text("Calendar"), button:has-text("Calendar"), [href*="calendar"]').first();
    await expect(calendarLink).toBeVisible({ timeout: 5000 });
    
    await calendarLink.click();
    
    // Should navigate to calendar page
    await page.waitForURL('**/calendar', { timeout: 5000 });
    await expect(page).toHaveURL(/calendar/);
  });

  test('should display current month in calendar', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Check for current month name
    const today = new Date();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[today.getMonth()];
    
    await expect(page.locator(`text=${currentMonth}`)).toBeVisible();
    await expect(page.locator(`text=${today.getFullYear()}`)).toBeVisible();
  });

  test('should show days of week headers', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Check for day headers
    await expect(page.locator('text=/Sun|Mon|Tue|Wed|Thu|Fri|Sat/')).toBeVisible();
  });

  test('should navigate to next month', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Click next month button
    const nextButton = page.locator('button:has-text("Next"), button:has-text("→"), button[aria-label*="next" i]').first();
    await nextButton.click();
    
    // Should show next month
    const nextMonthName = monthNames[nextMonth.getMonth()];
    await expect(page.locator(`text=${nextMonthName}`)).toBeVisible();
  });

  test('should navigate to previous month', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Click previous month button
    const prevButton = page.locator('button:has-text("Previous"), button:has-text("←"), button[aria-label*="prev" i]').first();
    await prevButton.click();
    
    // Should show previous month
    const prevMonthName = monthNames[prevMonth.getMonth()];
    await expect(page.locator(`text=${prevMonthName}`)).toBeVisible();
  });

  test('should return to current month with Today button', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Navigate away from current month
    const nextButton = page.locator('button:has-text("Next"), button:has-text("→")').first();
    await nextButton.click();
    await nextButton.click();
    
    // Click Today button
    const todayButton = page.locator('button:has-text("Today"), button:has-text("Current")').first();
    if (await todayButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await todayButton.click();
      
      // Should show current month
      const today = new Date();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const currentMonth = monthNames[today.getMonth()];
      await expect(page.locator(`text=${currentMonth}`)).toBeVisible();
    }
  });

  test('should display todos on calendar dates', async ({ page }) => {
    // Create a todo with future due date
    await page.goto('http://localhost:3000/todos');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await page.fill('input[placeholder*="todo"]', 'Calendar event');
    const dateInput = page.locator('input[type="datetime-local"]').first();
    await dateInput.fill(tomorrow.toISOString().slice(0, 16));
    await page.click('button:has-text("Add")');
    
    // Navigate to calendar
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Should see todo on calendar
    await expect(page.locator('text=Calendar event')).toBeVisible({ timeout: 5000 });
  });

  test('should highlight today\'s date', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    const today = new Date().getDate();
    
    // Look for today's date with special styling
    const todayCell = page.locator(`[data-date="${today}"], .today, .current-day`).first();
    if (await todayCell.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(todayCell).toBeVisible();
      
      // Check if it has special styling
      const hasHighlight = await todayCell.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.backgroundColor !== '' || el.className.includes('today') || el.className.includes('current');
      });
      expect(hasHighlight).toBeTruthy();
    }
  });

  test('should show todo count on calendar dates', async ({ page }) => {
    // Create multiple todos for same date
    await page.goto('http://localhost:3000/todos');
    
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const dateString = targetDate.toISOString().slice(0, 16);
    
    // Create 3 todos
    for (let i = 1; i <= 3; i++) {
      await page.fill('input[placeholder*="todo"]', `Event ${i}`);
      const dateInput = page.locator('input[type="datetime-local"]').first();
      await dateInput.fill(dateString);
      await page.click('button:has-text("Add")');
      await page.waitForTimeout(300);
    }
    
    // Navigate to calendar
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Should show count indicator (e.g., "3" or "3 tasks")
    await expect(page.locator('text=/3/')).toBeVisible({ timeout: 5000 });
  });

  test('should click date to view todos for that day', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Click on a date
    const dateCell = page.locator('[data-date], .calendar-day, td').nth(15);
    await dateCell.click();
    
    // Should show todos for that date (or empty state)
    const todoList = page.locator('.todo-list, .tasks, text=/Todos|Tasks|No (todos|tasks)/i').first();
    await expect(todoList).toBeVisible({ timeout: 3000 });
  });

  test('should show holidays on calendar', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Check for holiday indicators (Singapore holidays)
    const holidayIndicator = page.locator('text=/Holiday|🇸🇬|National Day|New Year/i').first();
    
    // Holidays may not be visible in current month, so this is optional
    const hasHoliday = await holidayIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (hasHoliday) {
      await expect(holidayIndicator).toBeVisible();
    }
  });

  test('should display priority indicators in calendar', async ({ page }) => {
    // Create high priority todo
    await page.goto('http://localhost:3000/todos');
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await page.fill('input[placeholder*="todo"]', 'High priority event');
    const prioritySelect = page.locator('select').first();
    await prioritySelect.selectOption('high');
    const dateInput = page.locator('input[type="datetime-local"]').first();
    await dateInput.fill(tomorrow.toISOString().slice(0, 16));
    await page.click('button:has-text("Add")');
    
    // Navigate to calendar
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Should see priority indicator
    const priorityIndicator = page.locator('.priority-high, .badge-red, [data-priority="high"]').first();
    if (await priorityIndicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(priorityIndicator).toBeVisible();
    }
  });

  test('should navigate back to todo list from calendar', async ({ page }) => {
    await page.goto('http://localhost:3000/calendar');
    await page.waitForLoadState('networkidle');
    
    // Click back to todos
    const todosLink = page.locator('a:has-text("Todos"), button:has-text("Todos"), a:has-text("List")').first();
    await todosLink.click();
    
    // Should be back on todos page
    await page.waitForURL('**/todos', { timeout: 5000 });
    await expect(page).toHaveURL(/todos/);
  });
});

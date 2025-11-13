# PRP-05: Reminders & Notifications

**Feature**: Browser Push Notifications for Todo Reminders  
**Priority**: P1 (High Priority)  
**Status**: Specification  
**Last Updated**: November 13, 2025

---

## 📋 Feature Overview

The Reminders & Notifications feature enables users to receive timely browser push notifications before their todos are due. Users can configure notification timing for each todo (e.g., 15 minutes, 1 hour, 1 day before), ensuring they never miss important deadlines. The system uses a polling mechanism to check for upcoming reminders and displays native browser notifications when todos are due.

This feature enhances the todo app's value by transforming it from a passive task list into an active reminder system that keeps users on track.

### Key Capabilities
- **Configurable Timing**: Choose from 7 preset reminder intervals (15m, 30m, 1h, 2h, 1d, 2d, 1w before due date)
- **Browser Notifications**: Native OS-level notifications with todo title and due date
- **Duplicate Prevention**: Track sent notifications to avoid repeated alerts for the same todo
- **Permission Management**: Request and handle notification permissions gracefully
- **Automatic Polling**: Background checks every 30 seconds for upcoming reminders
- **Singapore Timezone**: All time calculations use Singapore timezone for consistency
- **Reminder Badge**: Visual indicator on todos showing when reminder is set

---

## 👥 User Stories

### Primary User Persona: Busy Professional in Singapore

**As a** busy professional with back-to-back meetings  
**I want to** receive a notification 15 minutes before my next meeting  
**So that** I have time to wrap up my current task and prepare

**As a** forgetful task manager  
**I want to** set reminders 1 day before important deadlines  
**So that** I have advance warning to prioritize critical work

**As a** morning routine enthusiast  
**I want to** get a daily notification at 6:30 AM for my morning checklist  
**So that** I start my day with a structured routine

**As a** cautious planner  
**I want to** receive a notification 1 week before a big project deadline  
**So that** I have sufficient time to plan and execute

**As a** privacy-conscious user  
**I want to** grant notification permissions only once  
**So that** I'm not repeatedly interrupted with permission requests

**As a** user who completes tasks early  
**I want to** not receive notifications for already-completed todos  
**So that** I'm only alerted about relevant pending tasks

---

## 🔄 User Flow

### Flow 1: Setting Up First Reminder

1. User creates or edits a todo with a due date (e.g., "Team meeting" due Nov 13, 2025 at 3:00 PM)
2. User sees reminder dropdown with options: 15m, 30m, 1h, 2h, 1d, 2d, 1w before
3. User selects "15 minutes before"
4. **First-time only**: Browser prompts "Allow notifications from this site?"
5. User clicks "Allow"
6. Reminder is saved with todo (stored as `reminder_minutes: 15`)
7. Small clock icon badge appears on todo showing "🔔 15m before"
8. User continues using the app

### Flow 2: Receiving a Notification

1. User's browser is open with the app in a tab (active or background)
2. System polls `/api/notifications/check` every 30 seconds
3. Current time reaches 2:45 PM (15 minutes before 3:00 PM meeting)
4. Backend identifies "Team meeting" todo as due for reminder
5. Frontend receives notification payload
6. **Native browser notification appears**:
   - **Title**: "Todo Due Soon: Team meeting"
   - **Body**: "Due at Nov 13, 2025 3:00 PM SGT"
   - **Icon**: App logo
7. Backend marks notification as sent (`last_notification_sent: 2025-11-13T14:45:00+08:00`)
8. User clicks notification → Browser focuses on todo app tab
9. Todo remains visible with reminder badge (notification won't repeat)

### Flow 3: Editing/Removing a Reminder

1. User opens edit mode for existing todo
2. User sees current reminder setting in dropdown (e.g., "1 hour before")
3. User changes to "2 hours before" or selects "No reminder" to clear
4. On save, `reminder_minutes` updates to 120 or null
5. If changed, `last_notification_sent` resets to null (allows new notification)
6. Badge updates to reflect new reminder time or disappears if cleared

### Flow 4: Handling Permission Denial

1. User selects a reminder option for the first time
2. Browser shows permission prompt
3. User clicks "Block" or "X" (denies permission)
4. System detects permission denial
5. Alert appears: "Notifications are blocked. Please enable them in your browser settings to receive reminders."
6. Reminder dropdown becomes disabled with tooltip: "Enable notifications in browser settings"
7. Reminder value still saved in database (for when user enables later)
8. Badge shows reminder time but with a warning icon

### Flow 5: Notification with Completed Todo

1. User receives notification for "Submit report" due at 5:00 PM
2. Before notification time (e.g., at 4:30 PM), user completes the todo
3. At notification check time (4:45 PM), backend queries for pending notifications
4. SQL filter excludes completed todos (`WHERE completed = 0`)
5. No notification sent for "Submit report"
6. Polling continues normally for other active todos

---

## 🛠️ Technical Requirements

### Database Schema Updates

**Table**: `todos` (modifications to existing table)

```sql
ALTER TABLE todos ADD COLUMN reminder_minutes INTEGER DEFAULT NULL;
ALTER TABLE todos ADD COLUMN last_notification_sent TEXT DEFAULT NULL;

-- Index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_todos_reminder ON todos(user_id, completed, reminder_minutes, due_date, last_notification_sent);
```

**Column Descriptions**:
- `reminder_minutes`: Number of minutes before due_date to send notification (NULL = no reminder)
  - Valid values: 15, 30, 60, 120, 1440, 2880, 10080
- `last_notification_sent`: ISO 8601 timestamp of last notification sent (Singapore timezone)
  - Used to prevent duplicate notifications
  - Reset to NULL when reminder_minutes changes or todo is edited

### TypeScript Types

**File**: `lib/db.ts`

```typescript
export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: 'high' | 'medium' | 'low';
  recurrence_pattern: string | null;
  reminder_minutes: number | null;  // NEW
  last_notification_sent: string | null;  // NEW
  created_at: string;
  updated_at: string;
}

export interface CreateTodoInput {
  title: string;
  due_date?: string | null;
  priority?: 'high' | 'medium' | 'low';
  recurrence_pattern?: string | null;
  reminder_minutes?: number | null;  // NEW
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  due_date?: string | null;
  priority?: 'high' | 'medium' | 'low';
  recurrence_pattern?: string | null;
  reminder_minutes?: number | null;  // NEW
}

export interface NotificationPayload {
  todo_id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
}
```

### Database Operations

**File**: `lib/db.ts`

```typescript
export const notificationDB = {
  /**
   * Get todos that are due for notification
   * @param userId - Current user ID
   * @param now - Current Singapore time
   * @returns Array of todos needing notification
   */
  getPendingNotifications(userId: number, now: Date): NotificationPayload[] {
    const nowISO = now.toISOString();
    
    const stmt = db.prepare(`
      SELECT 
        id as todo_id,
        title,
        due_date,
        reminder_minutes
      FROM todos
      WHERE user_id = ?
        AND completed = 0
        AND due_date IS NOT NULL
        AND reminder_minutes IS NOT NULL
        AND (last_notification_sent IS NULL OR last_notification_sent < ?)
    `);
    
    const candidates = stmt.all(userId, nowISO) as NotificationPayload[];
    
    // Filter by actual notification time
    return candidates.filter(todo => {
      const dueDate = new Date(todo.due_date);
      const notifyTime = new Date(dueDate.getTime() - (todo.reminder_minutes * 60000));
      return notifyTime <= now;
    });
  },

  /**
   * Mark notification as sent
   * @param todoId - ID of todo
   * @param sentAt - Timestamp when notification was sent
   */
  markNotificationSent(todoId: number, sentAt: Date): void {
    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = ?,
          updated_at = ?
      WHERE id = ?
    `);
    
    const timestamp = sentAt.toISOString();
    stmt.run(timestamp, timestamp, todoId);
  },

  /**
   * Reset notification status (called when reminder time changes)
   * @param todoId - ID of todo
   */
  resetNotificationStatus(todoId: number): void {
    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = NULL,
          updated_at = ?
      WHERE id = ?
    `);
    
    stmt.run(getSingaporeNow().toISOString(), todoId);
  },
};
```

### API Endpoints

#### GET `/api/notifications/check` - Check for Pending Notifications

**Purpose**: Poll for todos that need notifications sent

**Authentication**: Required (JWT session)

**Request**: No body (GET request)

**Response** (200 OK):
```typescript
{
  notifications: [
    {
      todo_id: 123,
      title: "Team meeting",
      due_date: "2025-11-13T15:00:00+08:00",
      reminder_minutes: 15
    },
    // ... more notifications
  ]
}
```

**Error Responses**:
- `401 Unauthorized`: No valid session
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/notifications/check/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { notificationDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const now = getSingaporeNow();
    const notifications = notificationDB.getPendingNotifications(session.userId, now);

    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error('Error checking notifications:', error);
    return NextResponse.json(
      { error: 'Failed to check notifications' },
      { status: 500 }
    );
  }
}
```

#### POST `/api/notifications/mark-sent` - Mark Notification as Sent

**Purpose**: Record that a notification was successfully displayed to the user

**Authentication**: Required (JWT session)

**Request Body**:
```typescript
{
  todo_id: number;
}
```

**Response** (200 OK):
```typescript
{
  success: true
}
```

**Error Responses**:
- `400 Bad Request`: Invalid todo_id
- `401 Unauthorized`: No valid session
- `404 Not Found`: Todo not found or doesn't belong to user
- `500 Internal Server Error`: Database error

**Implementation** (`app/api/notifications/mark-sent/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { notificationDB, todoDB } from '@/lib/db';
import { getSingaporeNow } from '@/lib/timezone';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { todo_id } = body;

    if (!todo_id || typeof todo_id !== 'number') {
      return NextResponse.json({ error: 'Invalid todo_id' }, { status: 400 });
    }

    // Verify todo belongs to user
    const todo = todoDB.getById(session.userId, todo_id);
    if (!todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    notificationDB.markNotificationSent(todo_id, getSingaporeNow());

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as sent:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as sent' },
      { status: 500 }
    );
  }
}
```

### Client-Side Hook

**File**: `hooks/useNotifications.ts`

```typescript
'use client';

import { useEffect, useCallback, useState } from 'react';
import { NotificationPayload } from '@/lib/db';
import { formatSingaporeDate } from '@/lib/timezone';

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      alert("Your browser doesn't support notifications");
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported, permission]);

  const showNotification = useCallback(
    async (notification: NotificationPayload) => {
      if (permission !== 'granted') {
        console.warn('Cannot show notification: permission not granted');
        return;
      }

      try {
        const formattedDate = formatSingaporeDate(
          notification.due_date,
          'MMM dd, yyyy h:mm a'
        );

        new Notification(`Todo Due Soon: ${notification.title}`, {
          body: `Due at ${formattedDate} SGT`,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          tag: `todo-${notification.todo_id}`, // Prevent duplicates
          requireInteraction: false,
          silent: false,
        });

        // Mark as sent in backend
        await fetch('/api/notifications/mark-sent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ todo_id: notification.todo_id }),
        });
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    },
    [permission]
  );

  const checkForNotifications = useCallback(async () => {
    if (permission !== 'granted') {
      return;
    }

    try {
      const response = await fetch('/api/notifications/check');
      if (!response.ok) {
        throw new Error('Failed to check notifications');
      }

      const data = await response.json();
      const { notifications } = data;

      if (notifications && notifications.length > 0) {
        for (const notification of notifications) {
          await showNotification(notification);
        }
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, [permission, showNotification]);

  // Start polling for notifications
  useEffect(() => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    // Initial check
    checkForNotifications();

    // Set up polling interval
    const intervalId = setInterval(checkForNotifications, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isSupported, permission, checkForNotifications]);

  return {
    permission,
    isSupported,
    requestPermission,
    checkForNotifications,
  };
}
```

### Reminder Constants

**File**: `lib/constants.ts`

```typescript
export const REMINDER_OPTIONS = [
  { label: 'No reminder', value: null },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
  { label: '1 week before', value: 10080 },
] as const;

export type ReminderValue = typeof REMINDER_OPTIONS[number]['value'];

export function getReminderLabel(minutes: number | null): string {
  const option = REMINDER_OPTIONS.find(opt => opt.value === minutes);
  return option?.label || 'No reminder';
}
```

---

## 🎨 UI Components

### Reminder Dropdown Component

**File**: `components/ReminderDropdown.tsx`

```typescript
'use client';

import { REMINDER_OPTIONS, ReminderValue } from '@/lib/constants';
import { useNotifications } from '@/hooks/useNotifications';

interface ReminderDropdownProps {
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  hasDueDate: boolean;
}

export function ReminderDropdown({ 
  value, 
  onChange, 
  disabled = false,
  hasDueDate 
}: ReminderDropdownProps) {
  const { permission, requestPermission, isSupported } = useNotifications();

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value === '' ? null : parseInt(e.target.value, 10);
    
    // Request permission on first reminder selection
    if (newValue !== null && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        alert('Please enable notifications in your browser settings to use reminders.');
        return;
      }
    }

    onChange(newValue);
  };

  const isDisabled = disabled || !hasDueDate || !isSupported || permission === 'denied';

  return (
    <div className="flex flex-col gap-1">
      <select
        value={value ?? ''}
        onChange={handleChange}
        disabled={isDisabled}
        className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          !hasDueDate 
            ? 'Add a due date to set reminders'
            : permission === 'denied'
            ? 'Notifications are blocked. Enable them in browser settings.'
            : !isSupported
            ? 'Notifications are not supported in this browser'
            : ''
        }
      >
        {REMINDER_OPTIONS.map(option => (
          <option key={option.value ?? 'none'} value={option.value ?? ''}>
            {option.label}
          </option>
        ))}
      </select>

      {!hasDueDate && (
        <span className="text-xs text-gray-500">
          Due date required for reminders
        </span>
      )}

      {permission === 'denied' && (
        <span className="text-xs text-red-500">
          ⚠️ Enable notifications in browser settings
        </span>
      )}
    </div>
  );
}
```

### Reminder Badge Component

**File**: `components/ReminderBadge.tsx`

```typescript
import { getReminderLabel } from '@/lib/constants';

interface ReminderBadgeProps {
  reminderMinutes: number | null;
  hasNotificationPermission: boolean;
}

export function ReminderBadge({ 
  reminderMinutes, 
  hasNotificationPermission 
}: ReminderBadgeProps) {
  if (!reminderMinutes) {
    return null;
  }

  const label = getReminderLabel(reminderMinutes);
  const shortLabel = label.replace(' before', '');

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        hasNotificationPermission
          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      }`}
      title={hasNotificationPermission ? label : 'Notifications disabled in browser'}
    >
      {hasNotificationPermission ? '🔔' : '⚠️'} {shortLabel}
    </span>
  );
}
```

### Integration in Main Todo Page

**File**: `app/page.tsx` (additions to existing component)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@/lib/db';
import { ReminderDropdown } from '@/components/ReminderDropdown';
import { ReminderBadge } from '@/components/ReminderBadge';
import { useNotifications } from '@/hooks/useNotifications';

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { permission } = useNotifications();

  // ... existing state and functions ...

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          due_date: newDueDate || null,
          priority: newPriority,
          reminder_minutes: newReminderMinutes, // NEW
        }),
      });

      if (!response.ok) throw new Error('Failed to create todo');
      const createdTodo = await response.json();
      setTodos([createdTodo, ...todos]);
      
      // Reset form
      setNewTitle('');
      setNewDueDate('');
      setNewPriority('medium');
      setNewReminderMinutes(null); // NEW
    } catch (err) {
      setError('Failed to create todo');
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">My Todos</h1>

      {/* Create Todo Form */}
      <form onSubmit={handleCreate} className="mb-6 space-y-3">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={500}
        />
        
        <div className="flex gap-2">
          <input
            type="datetime-local"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* NEW: Reminder Dropdown */}
          <ReminderDropdown
            value={newReminderMinutes}
            onChange={setNewReminderMinutes}
            hasDueDate={!!newDueDate}
          />
          
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            disabled={!newTitle.trim()}
          >
            Add
          </button>
        </div>
      </form>

      {/* Todo List */}
      <div className="space-y-2">
        {todos.map(todo => (
          <div
            key={todo.id}
            className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm"
          >
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => handleToggleComplete(todo)}
              className="w-5 h-5 cursor-pointer"
            />

            <div className="flex-1">
              <p className={todo.completed ? 'line-through text-gray-400' : ''}>
                {todo.title}
              </p>
              
              <div className="flex items-center gap-2 mt-1">
                {todo.due_date && (
                  <span className="text-sm text-gray-500">
                    Due: {formatSingaporeDate(todo.due_date, 'MMM dd, yyyy h:mm a')}
                  </span>
                )}
                
                {/* NEW: Reminder Badge */}
                <ReminderBadge
                  reminderMinutes={todo.reminder_minutes}
                  hasNotificationPermission={permission === 'granted'}
                />
              </div>
            </div>

            {/* Edit/Delete buttons... */}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ⚠️ Edge Cases

### 1. Notification Permission Denied
**Scenario**: User blocks notifications or clicks "X" on permission prompt  
**Handling**:
- Store permission state in component
- Disable reminder dropdown with tooltip: "Enable notifications in browser settings"
- Show warning badge on todos with reminders (⚠️ icon instead of 🔔)
- Allow reminder values to be saved (user might enable later)
- Provide help text linking to browser settings instructions

### 2. Browser Doesn't Support Notifications
**Scenario**: User accesses app from unsupported browser  
**Handling**:
- Check `'Notification' in window` on mount
- Disable reminder features completely
- Show info banner: "Notifications are not supported in this browser. Try Chrome, Firefox, or Safari."
- Hide reminder dropdown from UI

### 3. Tab Closed/Browser Closed
**Scenario**: User closes browser tab or quits browser before notification time  
**Handling**:
- Notifications stop working (no service worker in this implementation)
- `last_notification_sent` remains null
- When user reopens app, polling resumes
- If notification time has passed, it will fire immediately if still within 30-second polling window
- Consider service worker implementation for background notifications in future

### 4. Multiple Tabs Open
**Scenario**: User has app open in multiple browser tabs  
**Handling**:
- Each tab polls independently every 30 seconds
- First tab to check may send notification and mark as sent
- Other tabs' subsequent checks find `last_notification_sent` is not null, skip notification
- Duplicate notification protection works via database state

### 5. Notification Time Already Passed
**Scenario**: User sets reminder for "15 minutes before" but due date is in 10 minutes  
**Handling**:
- Allow saving (notification time calculation happens server-side)
- If notify time is in the past, next polling check will catch it immediately
- Notification fires on next poll (within 30 seconds)
- Alternative: Client-side validation to warn user "Reminder time has passed"

### 6. Editing Todo with Pending Notification
**Scenario**: User edits todo title/due date after notification is already sent  
**Handling**:
- If `reminder_minutes` changes, reset `last_notification_sent` to null
- If `due_date` changes, reset `last_notification_sent` to null (allows new notification at new time)
- If only title changes, preserve `last_notification_sent` (avoid duplicate)
- Update logic in `todoDB.update()`:
  ```typescript
  if (input.reminder_minutes !== undefined || input.due_date !== undefined) {
    updates.push('last_notification_sent = NULL');
  }
  ```

### 7. System Clock Changes
**Scenario**: User's system clock is adjusted forward or backward  
**Handling**:
- Use Singapore timezone consistently via `getSingaporeNow()`
- Calculations based on server time (API responses)
- Client clock mismatch won't affect notification logic
- Worst case: Notification delayed by up to 30 seconds (next poll)

### 8. Completing Todo After Notification Sent
**Scenario**: User completes todo immediately after receiving notification  
**Handling**:
- SQL query filters by `completed = 0`
- Completed todos excluded from future checks
- `last_notification_sent` timestamp preserved (for audit/debugging)
- No cleanup needed

### 9. Recurring Todo Notifications
**Scenario**: User completes recurring todo with reminder; next instance created  
**Handling**:
- When creating next recurring instance, copy `reminder_minutes`
- Reset `last_notification_sent` to null for new instance
- New instance eligible for notification at its due time
- Logic in recurring todo creation:
  ```typescript
  const nextTodo = {
    ...todo,
    id: undefined,
    completed: 0,
    due_date: nextDueDate,
    last_notification_sent: null, // Reset for new instance
  };
  ```

### 10. Rapid Due Date Changes
**Scenario**: User repeatedly edits due date within short time window  
**Handling**:
- Each edit resets `last_notification_sent` to null
- Allows notification at new time
- Potential spam if user edits many times near notification time
- Mitigation: Client-side debouncing on save (300ms delay)
- Rate limiting on API (max 10 updates per minute per user)

### 11. Notification While App is Inactive
**Scenario**: App tab is open but browser is minimized or user is on different app  
**Handling**:
- Polling continues in background (browser allows this)
- Notification appears at OS level (visible in notification center)
- User clicks notification → Browser focuses and brings tab to foreground
- Default browser behavior, no custom handling needed

### 12. Notification Sound/Vibration
**Scenario**: User wants notifications to be silent or vice versa  
**Handling**:
- Use `silent: false` parameter in Notification API (allows browser default)
- Browser settings control sound/vibration (user preference)
- No in-app settings for this (respect browser/OS preferences)
- Future enhancement: Add app-level preference for silent mode

---

## ✅ Acceptance Criteria

### Functional Requirements

1. **Set Reminder on Todo**
   - [ ] User can select reminder timing from dropdown (7 options + "No reminder")
   - [ ] Reminder dropdown is disabled if no due date is set
   - [ ] Reminder value is saved with todo (`reminder_minutes` column)
   - [ ] Reminder badge appears on todo showing selected timing
   - [ ] User can change reminder timing by editing todo

2. **Permission Management**
   - [ ] On first reminder selection, browser permission prompt appears
   - [ ] If user grants permission, reminder is saved and works
   - [ ] If user denies permission, alert message shows with instructions
   - [ ] Reminder dropdown disabled if permission is denied
   - [ ] Denied permission shows warning badge on todos with reminders

3. **Receive Notifications**
   - [ ] Browser notification appears at correct time (e.g., 15 min before due)
   - [ ] Notification shows todo title in title
   - [ ] Notification shows formatted due date in body (Singapore time)
   - [ ] Notification includes app icon
   - [ ] Clicking notification focuses browser tab with app

4. **Duplicate Prevention**
   - [ ] Each todo sends notification only once per due date
   - [ ] `last_notification_sent` timestamp recorded after notification
   - [ ] Subsequent polling checks skip already-notified todos
   - [ ] Editing due date or reminder time resets notification status

5. **Polling Mechanism**
   - [ ] App polls `/api/notifications/check` every 30 seconds
   - [ ] Polling only active when notification permission is granted
   - [ ] Polling stops when tab is closed
   - [ ] Polling resumes when tab is reopened

6. **Completed Todos**
   - [ ] Notifications not sent for completed todos
   - [ ] Completing todo after notification doesn't cause errors
   - [ ] SQL query filters by `completed = 0`

7. **Recurring Todos**
   - [ ] Next recurring instance inherits `reminder_minutes` value
   - [ ] Next recurring instance has `last_notification_sent = NULL`
   - [ ] Notification works correctly for each recurring instance

### Non-Functional Requirements

1. **Performance**
   - [ ] Notification check completes in < 200ms
   - [ ] Polling doesn't cause noticeable UI lag
   - [ ] Database index on reminder columns for efficient queries
   - [ ] Maximum 10 notifications processed per poll

2. **Reliability**
   - [ ] Notifications work across browser restarts (if tab reopened)
   - [ ] No duplicate notifications across multiple tabs
   - [ ] Graceful handling of API errors during polling
   - [ ] Retry logic for failed notification marking

3. **Usability**
   - [ ] Clear visual indicators for reminder status (badge)
   - [ ] Helpful tooltips when reminders are disabled
   - [ ] Permission prompt only appears when necessary
   - [ ] Error messages are actionable (link to settings)

4. **Security**
   - [ ] User can only receive notifications for their own todos
   - [ ] Session authentication required for notification API
   - [ ] No sensitive data in notification body

### Testing Requirements

1. **E2E Tests (Playwright)**
   ```typescript
   test('should send notification at correct time', async ({ page, context }) => {
     // Grant notification permission
     await context.grantPermissions(['notifications']);

     // Create todo with due date 1 minute in future
     // Set reminder to 15 minutes before
     // Mock system time to notification time
     // Verify notification appears
     // Verify notification marked as sent
   });

   test('should handle permission denial', async ({ page, context }) => {
     // Deny notification permission
     await context.denyPermissions(['notifications']);

     // Try to set reminder
     // Verify alert message appears
     // Verify reminder dropdown is disabled
   });

   test('should not send duplicate notifications', async ({ page }) => {
     // Set up todo with reminder
     // Trigger notification
     // Advance time by 30 seconds
     // Verify no second notification
   });
   ```

2. **Unit Tests**
   ```typescript
   test('getPendingNotifications filters correctly', () => {
     // Create test todos with various states
     // Verify only eligible todos returned
     // Test timezone calculations
   });

   test('markNotificationSent updates timestamp', () => {
     // Create todo with null last_notification_sent
     // Call markNotificationSent
     // Verify timestamp is set
   });

   test('resetNotificationStatus clears timestamp', () => {
     // Create todo with last_notification_sent value
     // Call resetNotificationStatus
     // Verify timestamp is null
   });
   ```

3. **Manual Testing Checklist**
   - [ ] Test all 7 reminder timing options
   - [ ] Test permission granted flow
   - [ ] Test permission denied flow
   - [ ] Test notification appearance and styling
   - [ ] Test clicking notification focuses tab
   - [ ] Test editing reminder resets notification
   - [ ] Test multiple tabs don't duplicate notifications
   - [ ] Test browser restart persists reminders
   - [ ] Test completed todos don't send notifications
   - [ ] Test recurring todos send notifications for each instance

---

## 🚀 Implementation Plan

### Phase 1: Database & API (2 days)
1. Add `reminder_minutes` and `last_notification_sent` columns to todos table
2. Create migration script
3. Implement `notificationDB` functions
4. Create `/api/notifications/check` endpoint
5. Create `/api/notifications/mark-sent` endpoint
6. Add reminder fields to todo CRUD endpoints
7. Write unit tests for database operations

### Phase 2: Client-Side Logic (2 days)
1. Create `useNotifications` hook
2. Implement permission request logic
3. Implement polling mechanism
4. Implement notification display logic
5. Add notification click handler
6. Write unit tests for hook logic

### Phase 3: UI Components (2 days)
1. Create `ReminderDropdown` component
2. Create `ReminderBadge` component
3. Integrate into main todo page
4. Add reminder fields to create form
5. Add reminder fields to edit form
6. Style components with Tailwind CSS
7. Add tooltips and help text

### Phase 4: Testing & Polish (2 days)
1. Write E2E tests for notification flow
2. Write E2E tests for permission handling
3. Test cross-browser compatibility
4. Test all edge cases
5. Performance optimization
6. Documentation updates
7. User acceptance testing

**Total Estimated Time**: 8 days

---

## 📊 Success Metrics

### Quantitative Metrics
- **Adoption Rate**: >60% of users with due dates set at least one reminder
- **Notification Delivery**: >95% of reminders sent within 30 seconds of scheduled time
- **Permission Grant Rate**: >70% of users grant notification permission
- **Error Rate**: <1% of notification checks result in errors
- **Performance**: Average notification check completes in <150ms

### Qualitative Metrics
- Users report feeling more prepared for tasks
- Reduction in missed deadlines (user survey)
- Positive feedback on timing options (user feedback)
- No complaints about notification spam
- Improved user engagement with app (return visits)

---

## 🔮 Future Enhancements

### Phase 2 Features (Out of Scope for This PRP)

1. **Service Worker Background Notifications**
   - Send notifications even when browser tab is closed
   - Requires PWA setup and service worker registration
   - More complex implementation but better UX

2. **Custom Reminder Times**
   - Allow users to type custom minute values (e.g., "45 minutes before")
   - Validation for reasonable ranges (1 minute to 1 month)
   - More flexible but more complex UI

3. **Multiple Reminders Per Todo**
   - E.g., reminder 1 week before AND 1 day before
   - Requires database schema change (reminders junction table)
   - More powerful but increases complexity

4. **Notification Preferences**
   - Per-todo sound/vibration settings
   - App-wide notification settings page
   - "Do Not Disturb" schedule (e.g., no notifications 10 PM - 8 AM)

5. **Email/SMS Reminders**
   - Backup notifications via email or SMS
   - Requires user email/phone collection
   - Requires email service integration (e.g., SendGrid)
   - Increases operational complexity and cost

6. **Smart Reminder Suggestions**
   - AI-powered recommendations based on user behavior
   - E.g., "You usually set 1-day reminders for work tasks"
   - Requires analytics and ML model

7. **Snooze Notifications**
   - Allow user to snooze notification for 5/10/15 minutes
   - Requires tracking snoozed state in database
   - More complex notification logic

---

## 📚 Dependencies

### New Dependencies
- None (uses native browser Notification API)

### Existing Dependencies
- `date-fns-tz`: Timezone handling (already in project)
- `better-sqlite3`: Database operations (already in project)
- Next.js API routes (already in project)
- React hooks (already in project)

### Browser Requirements
- Notification API support (Chrome 22+, Firefox 22+, Safari 7+, Edge 14+)
- Permissions API support (same as above)
- JavaScript enabled
- Cookies enabled (for session management)

### Server Requirements
- No additional server requirements
- Existing SQLite database
- Existing Next.js API routes infrastructure

---

## 🔒 Security Considerations

1. **Authentication**
   - All notification endpoints require valid session
   - User can only receive notifications for their own todos
   - Session validation on every API call

2. **Data Privacy**
   - Notification content limited to todo title and due date
   - No sensitive metadata exposed
   - No user PII in notification body

3. **Rate Limiting**
   - Polling limited to 30-second intervals
   - API endpoint rate limiting to prevent abuse
   - Maximum 10 notifications processed per check

4. **XSS Prevention**
   - Todo titles sanitized before display in notifications
   - No HTML rendering in notification content
   - Text-only notification body

5. **Permission Abuse**
   - Permission requested only when user takes action (sets reminder)
   - No unsolicited permission prompts
   - Clear explanation of why permission is needed

---

## 📖 Documentation Updates Required

1. **User Guide**
   - How to enable notifications in different browsers
   - Explanation of reminder timing options
   - Troubleshooting permission issues
   - What to do if notifications stop working

2. **Developer Documentation**
   - Polling mechanism architecture
   - Database schema changes
   - API endpoint specifications
   - Testing notification flows locally

3. **README Updates**
   - Add "Reminders & Notifications" to features list
   - Update browser compatibility notes
   - Add notification setup instructions for development

---

## ❌ Out of Scope

The following are explicitly **not** included in this PRP:

1. ~~Push notifications when browser is closed~~ (requires service worker)
2. ~~Email or SMS reminders~~ (requires external service)
3. ~~Custom notification sounds~~ (uses browser defaults)
4. ~~Notification history/log~~ (can be future enhancement)
5. ~~Notification grouping~~ (shows one notification per todo)
6. ~~Rich notification actions~~ (e.g., "Snooze" or "Mark Done" buttons)
7. ~~Desktop notification settings~~ (uses browser settings)
8. ~~Mobile push notifications~~ (separate mobile app feature)
9. ~~Notification analytics~~ (e.g., click-through rates)
10. ~~Third-party notification services~~ (e.g., Firebase Cloud Messaging)

---

## 🎯 Definition of Done

This feature is considered complete when:

- [ ] All database migrations are applied successfully
- [ ] All API endpoints are implemented and tested
- [ ] Client-side polling is working correctly
- [ ] Notifications display at the correct time
- [ ] Duplicate prevention is functioning
- [ ] Permission handling works for all scenarios
- [ ] All edge cases are handled gracefully
- [ ] UI components are fully styled and responsive
- [ ] All unit tests pass (>90% coverage)
- [ ] All E2E tests pass
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari)
- [ ] Code review completed and approved
- [ ] Documentation is updated
- [ ] User acceptance testing completed
- [ ] Feature merged to main branch
- [ ] Deployed to production successfully
- [ ] No critical bugs reported for 1 week post-launch

---

**Document Control**:
- **Version**: 1.0
- **Created**: November 13, 2025
- **Last Updated**: November 13, 2025
- **Author**: AI Assistant (based on yue-lin_stengg's request)
- **Status**: Draft - Awaiting Review
- **Related PRPs**: PRP-01 (Todo CRUD), PRP-04 (Recurring Todos)

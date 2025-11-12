# PRP-04: Reminders & Notifications

## Feature Overview

The Reminders & Notifications feature provides users with timely browser notifications for upcoming todos, ensuring important tasks are never missed. This system operates entirely client-side using the Web Notifications API with backend support for notification timing calculations.

**Key Capabilities:**
- **Browser Notifications**: Native desktop/mobile notifications that appear even when the app tab is in the background
- **Flexible Timing Options**: Six preset intervals (15 minutes, 30 minutes, 1 hour, 2 hours, 1 day, 1 week before due date)
- **Singapore Timezone Calculations**: All reminder time calculations use `Asia/Singapore` timezone for consistency
- **Smart Polling**: Client-side periodic checks with configurable intervals (default: every 1 minute)
- **Duplicate Prevention**: Server-side tracking of `last_notification_sent` prevents repeated notifications
- **Permission Management**: Graceful handling of notification permissions with user prompts
- **Recurring Todo Support**: Reminders automatically apply to next instances with same offset

**User Benefits:**
- Never miss important deadlines
- Reduce cognitive load of time tracking
- Stay on schedule without constant app checking
- Customize notification timing per task

## User Stories

### Primary User Personas

**1. Busy Executive (Jennifer)**
> "As an executive managing back-to-back meetings, I need reminder notifications 15 minutes before important tasks so I have time to prepare without constantly checking my todo list."

**Goals:**
- Timely alerts for imminent tasks
- Quick context switching between meetings
- Reduce time spent manually checking todos
- Never miss critical pre-meeting preparation

**Pain Points Without Feature:**
- Misses meeting prep tasks while in other meetings
- Has to set external calendar reminders duplicating todo list
- Forgets to review agendas before calls

**2. Freelancer (Marcus)**
> "As a freelancer juggling multiple client projects, I need 1-day advance reminders for deadlines so I can plan my workload and avoid last-minute rushes."

**Goals:**
- Advance warning for upcoming deliverables
- Better workload planning
- Avoid emergency overtime
- Maintain professional reputation

**Pain Points Without Feature:**
- Discovers deadlines too late for quality work
- Poor work-life balance from unexpected rushes
- Client dissatisfaction from missed timelines

**3. Health-Conscious Professional (Sarah)**
> "As someone managing daily medication and exercise routines, I need reliable reminders so I maintain healthy habits even during busy workdays."

**Goals:**
- Consistent habit maintenance
- Time-specific health routines
- Visible accountability
- Integration with daily schedule

**Pain Points Without Feature:**
- Forgets medications when focused on work
- Skips workouts without prompts
- Irregular health routine adherence

### User Needs

- Timely, reliable notification delivery
- Flexibility in reminder timing per task
- Clear, actionable notification content
- Minimal disruption to workflow
- Easy permission management
- Works across devices and browsers

## User Flow

### Primary Flow: Setting Up Reminder for New Todo

1. User clicks **"Add Todo"** button
2. User enters todo title: "Client presentation"
3. User sets **due date**: "2025-11-15 Friday 2:00 PM"
4. User clicks **"Reminder"** dropdown
5. System displays options:
   - None (default)
   - 15 minutes before
   - 30 minutes before
   - 1 hour before
   - 2 hours before
   - 1 day before
   - 1 week before
6. User selects **"1 hour before"**
7. User clicks **"Add Todo"**
8. **System saves `reminder_minutes = 60`**
9. Todo displays with bell icon (🔔) indicating reminder is active
10. System calculates notification time: Nov 15, 1:00 PM (due date - 1 hour)

### Secondary Flow: Receiving Browser Notification

**Precondition**: User has granted notification permissions

1. **[Background] Polling occurs every 1 minute**
2. Current time reaches 1:00 PM (notification time)
3. Client fetches `/api/notifications/check`
4. Server finds todo "Client presentation" is due in 60 minutes
5. Server checks `last_notification_sent` (NULL → not sent yet)
6. Server updates `last_notification_sent = 2025-11-15T13:00:00+08:00`
7. Server returns notification payload:
   ```json
   {
     "notifications": [{
       "todo_id": 42,
       "title": "Client presentation",
       "message": "Due in 1 hour (2:00 PM)",
       "priority": "high"
     }]
   }
   ```
8. **Client displays browser notification**:
   - Title: "🔔 Client presentation"
   - Body: "Due in 1 hour (2:00 PM)"
   - Icon: App icon
   - Tag: "todo-42" (for deduplication)
9. User sees notification on desktop/mobile
10. User clicks notification → browser focuses todo app tab
11. Todo app scrolls to and highlights "Client presentation"

### Tertiary Flow: Granting Notification Permissions

**First-Time User Experience**

1. User visits todo app for first time
2. User attempts to set reminder on a todo
3. **System checks**: `Notification.permission === 'default'`
4. System displays **permission request dialog**:
   - "Enable notifications to receive reminders"
   - "Allow" button, "Not now" button
5. User clicks **"Allow"**
6. **Browser prompts**: "[app-domain] wants to send notifications"
7. User clicks **"Allow"** in browser prompt
8. **System receives**: `Notification.permission === 'granted'`
9. Reminder dropdown becomes enabled
10. User can now set reminders on todos

**Permission Denied Flow**

1. User clicks "Block" or "Deny" in browser prompt
2. **System receives**: `Notification.permission === 'denied'`
3. System shows **persistent banner**:
   - "⚠️ Notifications blocked. Reminders won't work."
   - "To enable, allow notifications in browser settings"
   - Link to help documentation
4. Reminder dropdown shows ⚠️ icon and tooltip: "Enable browser notifications first"
5. User can still set reminders (stored in database) but won't receive notifications

### Quaternary Flow: Updating Reminder on Existing Todo

1. User locates todo with existing 1-hour reminder
2. User clicks **Edit** button
3. User opens **Reminder** dropdown
4. User selects **"1 day before"** (changes from 1 hour)
5. User clicks **"Save"**
6. **System updates `reminder_minutes = 1440`** (24 hours)
7. **System clears `last_notification_sent = NULL`** (reset notification state)
8. Next polling cycle will use new timing
9. Todo displays updated bell icon with "1d" label

### Edge Flow: Removing Reminder

1. User opens todo with active reminder
2. User clicks **Edit** button
3. User selects **"None"** from Reminder dropdown
4. User clicks **"Save"**
5. **System updates `reminder_minutes = NULL`**
6. **System clears `last_notification_sent = NULL`**
7. Bell icon disappears from todo
8. No notifications will be sent for this todo

### Edge Flow: Notification for Overdue Todo

1. Todo is past due date (e.g., due Nov 14, current time Nov 15)
2. Reminder was set for "1 hour before" (should have fired Nov 14 1:00 PM)
3. **System checks**: `last_notification_sent` is NULL
4. **System calculates**: Notification time was in past
5. **System skips notification** (doesn't send late notifications)
6. Todo shows as overdue in UI with red styling
7. No notification fires for past-due reminders

## Technical Requirements

### Database Schema

The `todos` table includes reminder columns:

```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
  is_completed INTEGER DEFAULT 0,
  due_date TEXT, -- ISO 8601 with timezone: 2025-11-15T14:00:00+08:00
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes INTEGER, -- Minutes before due_date to send notification
  last_notification_sent TEXT, -- ISO timestamp of when notification was last sent
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_todos_reminders ON todos(user_id, due_date, reminder_minutes, last_notification_sent);
CREATE INDEX idx_todos_notification_pending ON todos(user_id, is_completed, due_date) 
  WHERE reminder_minutes IS NOT NULL AND last_notification_sent IS NULL;
```

**Key Fields:**
- `reminder_minutes`: Integer offset before `due_date`. NULL = no reminder.
  - 15 = 15 minutes before
  - 60 = 1 hour before
  - 1440 = 1 day before (24 * 60)
  - 10080 = 1 week before (7 * 24 * 60)
- `last_notification_sent`: ISO timestamp when notification was last sent. Used for deduplication.

### TypeScript Types

Add to `lib/db.ts`:

```typescript
export type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 10080 | null;

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  priority: Priority;
  is_completed: number;
  due_date: string | null;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: ReminderMinutes;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string;
}

// Reminder configuration
export const REMINDER_CONFIG = {
  15: {
    label: '15 minutes before',
    shortLabel: '15m',
    minutes: 15,
    description: 'Notify 15 minutes before due time'
  },
  30: {
    label: '30 minutes before',
    shortLabel: '30m',
    minutes: 30,
    description: 'Notify 30 minutes before due time'
  },
  60: {
    label: '1 hour before',
    shortLabel: '1h',
    minutes: 60,
    description: 'Notify 1 hour before due time'
  },
  120: {
    label: '2 hours before',
    shortLabel: '2h',
    minutes: 120,
    description: 'Notify 2 hours before due time'
  },
  1440: {
    label: '1 day before',
    shortLabel: '1d',
    minutes: 1440,
    description: 'Notify 1 day before due time'
  },
  10080: {
    label: '1 week before',
    shortLabel: '1w',
    minutes: 10080,
    description: 'Notify 1 week before due time'
  }
} as const;

export interface NotificationPayload {
  todo_id: number;
  title: string;
  message: string;
  priority: Priority;
  due_date: string;
}
```

### Notification Time Calculation

**Critical**: All calculations use Singapore timezone via `lib/timezone.ts`:

```typescript
// lib/timezone.ts

import { zonedTimeToUtc, utcToZonedTime, format } from 'date-fns-tz';
import { subMinutes, isBefore, isAfter } from 'date-fns';

const SINGAPORE_TZ = 'Asia/Singapore';

export function calculateNotificationTime(
  dueDate: string,
  reminderMinutes: number
): Date {
  // Parse due date in Singapore timezone
  const dueDateObj = new Date(dueDate);
  const sgDueDate = utcToZonedTime(dueDateObj, SINGAPORE_TZ);
  
  // Subtract reminder minutes
  const notificationTime = subMinutes(sgDueDate, reminderMinutes);
  
  return notificationTime;
}

export function shouldSendNotification(
  dueDate: string,
  reminderMinutes: number,
  lastNotificationSent: string | null
): boolean {
  const now = getSingaporeNow();
  const notificationTime = calculateNotificationTime(dueDate, reminderMinutes);
  
  // Don't send if notification time hasn't arrived yet
  if (isBefore(now, notificationTime)) {
    return false;
  }
  
  // Don't send if notification time is in the past (overdue)
  const dueDateObj = new Date(dueDate);
  if (isBefore(dueDateObj, now)) {
    return false;
  }
  
  // Don't send if already sent
  if (lastNotificationSent) {
    return false;
  }
  
  return true;
}

export function formatReminderTime(dueDate: string, reminderMinutes: number): string {
  const notificationTime = calculateNotificationTime(dueDate, reminderMinutes);
  return format(notificationTime, 'MMM d, h:mm a', { timeZone: SINGAPORE_TZ });
}
```

### API Endpoints

#### 1. Check for Pending Notifications

**Endpoint**: `GET /api/notifications/check`

**Purpose**: Polled by client to fetch todos requiring notifications

**Query Parameters**: None (uses session user_id)

**Response** (200 OK):
```json
{
  "notifications": [
    {
      "todo_id": 42,
      "title": "Client presentation",
      "message": "Due in 1 hour (2:00 PM)",
      "priority": "high",
      "due_date": "2025-11-15T14:00:00+08:00"
    },
    {
      "todo_id": 58,
      "title": "Submit report",
      "message": "Due in 30 minutes (1:30 PM)",
      "priority": "medium",
      "due_date": "2025-11-15T13:30:00+08:00"
    }
  ],
  "count": 2
}
```

**Server Logic** (in `app/api/notifications/check/route.ts`):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB } from '@/lib/db';
import { getSingaporeNow, shouldSendNotification } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  const now = getSingaporeNow();
  
  // Fetch todos with reminders that haven't been sent
  const todos = todoDB.getPendingNotifications(session.userId);
  
  const notifications: NotificationPayload[] = [];
  
  for (const todo of todos) {
    if (!todo.due_date || !todo.reminder_minutes) continue;
    
    const shouldSend = shouldSendNotification(
      todo.due_date,
      todo.reminder_minutes,
      todo.last_notification_sent
    );
    
    if (shouldSend) {
      // Mark as sent
      todoDB.updateNotificationSent(todo.id, now.toISOString());
      
      // Calculate time until due
      const dueTime = new Date(todo.due_date);
      const minutesUntilDue = Math.round((dueTime.getTime() - now.getTime()) / 60000);
      
      let timeMessage: string;
      if (minutesUntilDue < 60) {
        timeMessage = `Due in ${minutesUntilDue} minutes`;
      } else if (minutesUntilDue < 1440) {
        const hours = Math.round(minutesUntilDue / 60);
        timeMessage = `Due in ${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        const days = Math.round(minutesUntilDue / 1440);
        timeMessage = `Due in ${days} day${days > 1 ? 's' : ''}`;
      }
      
      notifications.push({
        todo_id: todo.id,
        title: todo.title,
        message: timeMessage,
        priority: todo.priority,
        due_date: todo.due_date
      });
    }
  }
  
  return NextResponse.json({
    notifications,
    count: notifications.length
  });
}
```

#### 2. Create/Update Todo with Reminder

**Endpoint**: `POST /api/todos` or `PUT /api/todos/[id]`

**Request Body** (with reminder):
```json
{
  "title": "Team meeting",
  "due_date": "2025-11-15T10:00:00+08:00",
  "reminder_minutes": 60
}
```

**Response** (201 Created or 200 OK):
```json
{
  "id": 42,
  "title": "Team meeting",
  "due_date": "2025-11-15T10:00:00+08:00",
  "reminder_minutes": 60,
  "last_notification_sent": null,
  "created_at": "2025-11-14T15:00:00+08:00",
  "updated_at": "2025-11-14T15:00:00+08:00"
}
```

**Important**: When updating `reminder_minutes`, clear `last_notification_sent`:

```typescript
// In PUT /api/todos/[id]
if ('reminder_minutes' in updates) {
  updates.last_notification_sent = null; // Reset notification state
}
```

### Database Operations

Add to `lib/db.ts`:

```typescript
export const todoDB = {
  // ... existing methods ...
  
  getPendingNotifications(userId: number): Todo[] {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
        AND is_completed = 0
        AND due_date IS NOT NULL
        AND reminder_minutes IS NOT NULL
        AND last_notification_sent IS NULL
      ORDER BY due_date ASC
    `);
    return stmt.all(userId) as Todo[];
  },
  
  updateNotificationSent(id: number, timestamp: string): boolean {
    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    const result = stmt.run(timestamp, id);
    return result.changes > 0;
  },
  
  getWithReminders(userId: number): Todo[] {
    const stmt = db.prepare(`
      SELECT * FROM todos 
      WHERE user_id = ? 
        AND reminder_minutes IS NOT NULL
      ORDER BY due_date ASC NULLS LAST
    `);
    return stmt.all(userId) as Todo[];
  },
  
  clearNotificationSent(id: number): boolean {
    const stmt = db.prepare(`
      UPDATE todos 
      SET last_notification_sent = NULL, updated_at = datetime('now')
      WHERE id = ?
    `);
    const result = stmt.run(id);
    return result.changes > 0;
  }
};
```

## UI Components

### Notification Permission Manager Hook

```tsx
// lib/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { NotificationPayload } from '@/lib/db';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPolling, setIsPolling] = useState(false);
  
  useEffect(() => {
    // Check initial permission state
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);
  
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Enable them in browser settings.');
      return false;
    }
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === 'granted';
  }, []);
  
  const showNotification = useCallback((payload: NotificationPayload) => {
    if (Notification.permission !== 'granted') return;
    
    const notification = new Notification(`🔔 ${payload.title}`, {
      body: payload.message,
      icon: '/icon.png',
      tag: `todo-${payload.todo_id}`, // Prevent duplicates
      requireInteraction: false,
      silent: false
    });
    
    notification.onclick = () => {
      window.focus();
      // Scroll to todo (implementation depends on UI structure)
      const todoElement = document.querySelector(`[data-todo-id="${payload.todo_id}"]`);
      todoElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      notification.close();
    };
    
    // Auto-close after 10 seconds
    setTimeout(() => notification.close(), 10000);
  }, []);
  
  const startPolling = useCallback((intervalMs: number = 60000) => {
    if (isPolling) return;
    
    setIsPolling(true);
    
    const poll = async () => {
      try {
        const response = await fetch('/api/notifications/check');
        if (response.ok) {
          const data = await response.json();
          data.notifications.forEach((notif: NotificationPayload) => {
            showNotification(notif);
          });
        }
      } catch (error) {
        console.error('Notification polling error:', error);
      }
    };
    
    // Poll immediately, then every interval
    poll();
    const intervalId = setInterval(poll, intervalMs);
    
    return () => {
      clearInterval(intervalId);
      setIsPolling(false);
    };
  }, [isPolling, showNotification]);
  
  return {
    permission,
    requestPermission,
    showNotification,
    startPolling,
    isSupported: 'Notification' in window
  };
}
```

### Reminder Selector Component

```tsx
import { ReminderMinutes, REMINDER_CONFIG } from '@/lib/db';

interface ReminderSelectorProps {
  value: ReminderMinutes;
  onChange: (minutes: ReminderMinutes) => void;
  disabled?: boolean;
  hasDueDate: boolean;
  notificationsEnabled: boolean;
}

export function ReminderSelector({ 
  value, 
  onChange, 
  disabled,
  hasDueDate,
  notificationsEnabled
}: ReminderSelectorProps) {
  const isDisabled = disabled || !hasDueDate;
  
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="reminder" className="text-sm font-medium text-gray-700">
        Reminder
      </label>
      
      <select
        id="reminder"
        value={value ?? 'none'}
        onChange={(e) => {
          const val = e.target.value === 'none' ? null : parseInt(e.target.value) as ReminderMinutes;
          onChange(val);
        }}
        disabled={isDisabled}
        className="
          rounded-md border border-gray-300 px-3 py-2 text-sm
          focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
        "
        aria-label="Select reminder time"
      >
        <option value="none">No reminder</option>
        <option value="15">🔔 {REMINDER_CONFIG[15].label}</option>
        <option value="30">🔔 {REMINDER_CONFIG[30].label}</option>
        <option value="60">🔔 {REMINDER_CONFIG[60].label}</option>
        <option value="120">🔔 {REMINDER_CONFIG[120].label}</option>
        <option value="1440">🔔 {REMINDER_CONFIG[1440].label}</option>
        <option value="10080">🔔 {REMINDER_CONFIG[10080].label}</option>
      </select>
      
      {!hasDueDate && (
        <p className="text-xs text-amber-600">
          ⚠️ Set a due date to enable reminders
        </p>
      )}
      
      {hasDueDate && !notificationsEnabled && (
        <p className="text-xs text-amber-600">
          ⚠️ Enable browser notifications to receive reminders
        </p>
      )}
      
      {value && hasDueDate && (
        <p className="text-xs text-gray-500">
          {REMINDER_CONFIG[value].description}
        </p>
      )}
    </div>
  );
}
```

### Reminder Badge Component

```tsx
import { ReminderMinutes, REMINDER_CONFIG } from '@/lib/db';

interface ReminderBadgeProps {
  reminderMinutes: ReminderMinutes;
}

export function ReminderBadge({ reminderMinutes }: ReminderBadgeProps) {
  if (!reminderMinutes) return null;
  
  const config = REMINDER_CONFIG[reminderMinutes];
  
  return (
    <span 
      className="
        inline-flex items-center gap-1 rounded-full border
        bg-purple-50 text-purple-700 border-purple-200
        px-2 py-0.5 text-xs font-medium
      "
      aria-label={`Reminder: ${config.label}`}
      title={config.description}
    >
      <span>🔔</span>
      <span>{config.shortLabel}</span>
    </span>
  );
}
```

### Notification Permission Banner

```tsx
import { useNotifications } from '@/lib/hooks/useNotifications';

export function NotificationBanner() {
  const { permission, requestPermission, isSupported } = useNotifications();
  const [dismissed, setDismissed] = useState(false);
  
  if (!isSupported || permission === 'granted' || dismissed) {
    return null;
  }
  
  if (permission === 'denied') {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-amber-800">
              Notifications Blocked
            </p>
            <p className="mt-1 text-sm text-amber-700">
              Reminders won't work. Enable notifications in your browser settings.
            </p>
            <a 
              href="https://support.google.com/chrome/answer/3220216"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 text-sm text-amber-800 underline hover:text-amber-900"
            >
              Learn how →
            </a>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="ml-3 text-amber-500 hover:text-amber-700"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">🔔</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-blue-800">
            Enable Notifications
          </p>
          <p className="mt-1 text-sm text-blue-700">
            Get reminders for your todos even when the app is in the background.
          </p>
        </div>
        <div className="ml-3 flex gap-2">
          <button
            onClick={requestPermission}
            className="
              px-3 py-1 bg-blue-600 text-white text-sm rounded-md
              hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            "
          >
            Enable
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1 text-blue-700 text-sm hover:text-blue-900"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Integration in Main Todo Component

```tsx
// In app/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Todo, ReminderMinutes } from '@/lib/db';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { ReminderSelector } from '@/components/ReminderSelector';
import { ReminderBadge } from '@/components/ReminderBadge';
import { NotificationBanner } from '@/components/NotificationBanner';

export default function HomePage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const { permission, startPolling } = useNotifications();
  
  // Start polling for notifications
  useEffect(() => {
    if (permission === 'granted') {
      const cleanup = startPolling(60000); // Poll every 60 seconds
      return cleanup;
    }
  }, [permission, startPolling]);
  
  const [newTodo, setNewTodo] = useState({
    title: '',
    due_date: '',
    reminder_minutes: null as ReminderMinutes
  });
  
  const handleCreateTodo = async () => {
    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTodo)
    });
    
    if (response.ok) {
      const created = await response.json();
      setTodos(prev => [created, ...prev]);
      setNewTodo({ title: '', due_date: '', reminder_minutes: null });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationBanner />
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Add New Todo</h2>
        
        <input
          type="text"
          placeholder="Todo title"
          value={newTodo.title}
          onChange={(e) => setNewTodo(prev => ({ ...prev, title: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md mb-4"
        />
        
        <input
          type="datetime-local"
          value={newTodo.due_date}
          onChange={(e) => setNewTodo(prev => ({ ...prev, due_date: e.target.value }))}
          className="w-full px-3 py-2 border rounded-md mb-4"
        />
        
        <ReminderSelector
          value={newTodo.reminder_minutes}
          onChange={(minutes) => setNewTodo(prev => ({ ...prev, reminder_minutes: minutes }))}
          hasDueDate={!!newTodo.due_date}
          notificationsEnabled={permission === 'granted'}
        />
        
        <button
          onClick={handleCreateTodo}
          disabled={!newTodo.title}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Todo
        </button>
      </div>
      
      <div className="space-y-4">
        {todos.map(todo => (
          <div key={todo.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold">{todo.title}</h3>
            <div className="mt-2 flex gap-2">
              {todo.reminder_minutes && (
                <ReminderBadge reminderMinutes={todo.reminder_minutes} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Edge Cases

### 1. Notification Permission Denied Mid-Session

**Scenario**: User revokes notification permission after setting up reminders

**Expected Behavior**:
- Reminders remain in database (`reminder_minutes` preserved)
- Polling continues but notifications don't display
- Banner appears: "Notifications blocked"
- When permission re-granted, notifications resume
- No data loss

### 2. Multiple Todos with Same Notification Time

**Scenario**: Three todos all due at 2:00 PM with 1-hour reminders

**Expected Behavior**:
- All three notifications fire at 1:00 PM
- Each displays as separate browser notification
- Browser may group them (OS-dependent)
- All marked as sent in database
- Each clickable to its respective todo

### 3. Completing Todo Before Notification Fires

**Scenario**: Todo due at 2:00 PM with 1-hour reminder, completed at 12:30 PM

**Expected Behavior**:
- Polling skips completed todos (`is_completed = 1`)
- No notification sent
- `last_notification_sent` remains NULL
- Avoids notifications for already-completed tasks

### 4. Changing Due Date After Setting Reminder

**Scenario**: Todo due Nov 15 2:00 PM, reminder set for 1 hour before. User changes due date to Nov 16 2:00 PM.

**Expected Behavior**:
- `due_date` updates to Nov 16 2:00 PM
- `reminder_minutes` remains 60 (1 hour)
- `last_notification_sent` is **cleared to NULL** (reset notification state)
- New notification time: Nov 16 1:00 PM
- Old notification time (Nov 15 1:00 PM) is forgotten

**Implementation**:
```typescript
// In PUT /api/todos/[id]
if ('due_date' in updates) {
  updates.last_notification_sent = null; // Reset notification state
}
```

### 5. Browser Tab Closed During Notification Time

**Scenario**: Notification should fire at 1:00 PM but user closed browser at 12:55 PM

**Expected Behavior**:
- No notification fires (app not running)
- When user reopens app at 1:05 PM, polling checks pending notifications
- Server sees notification time (1:00 PM) is in past but todo not yet due
- **Server skips sending** (doesn't send late notifications)
- `last_notification_sent` remains NULL
- User sees todo in normal UI with bell icon

**Rationale**: Late notifications can be confusing. User sees todo in UI anyway.

### 6. Recurring Todo with Reminder

**Scenario**: Daily recurring todo with 1-hour reminder

**Expected Behavior**:
- When completing Nov 15 instance, next instance (Nov 16) inherits `reminder_minutes = 60`
- Next instance has `last_notification_sent = NULL` (fresh notification state)
- Nov 16 notification fires at calculated time
- Each instance gets its own notification

**Implementation** (in next instance creation):
```typescript
const newTodoId = todoDB.create({
  // ... other fields ...
  reminder_minutes: todo.reminder_minutes, // Inherit reminder
  last_notification_sent: null // Fresh notification state
});
```

### 7. Notification Time in the Past (Overdue Setup)

**Scenario**: User creates todo on Nov 15 at 2:00 PM with due date Nov 15 at 3:00 PM and reminder "1 day before"

**Expected Behavior**:
- Todo is created successfully
- Notification time would be Nov 14 at 3:00 PM (in past)
- Polling checks: `shouldSendNotification()` returns false (notification time passed)
- No notification fires
- User sees todo normally in UI with bell icon
- When due date arrives, todo shows as due (no notification)

### 8. Rapid Reminder Changes

**Scenario**: User changes reminder from 1 hour → 1 day → 30 minutes within 1 minute

**Expected Behavior**:
- Each update clears `last_notification_sent = NULL`
- Final state: `reminder_minutes = 30`, `last_notification_sent = NULL`
- Next polling cycle uses 30-minute timing
- No duplicate notifications from previous settings

### 9. Daylight Saving Time (DST) Edge Case

**Scenario**: Notification time crosses DST boundary (theoretical for Singapore)

**Expected Behavior**:
- Singapore doesn't observe DST, so non-issue for this app
- If app expanded to other timezones, `date-fns-tz` handles DST automatically
- Calculations always use `Asia/Singapore` timezone consistently

### 10. Browser Notification Queue Full

**Scenario**: User has 20+ notifications pending and browser limits queue

**Expected Behavior**:
- Browser-dependent behavior (Chrome allows ~3 visible at once)
- Older notifications may auto-dismiss
- All marked as sent in database (no re-sending)
- User can see missed notifications in todo list (bell icons on overdue todos)

### 11. Polling Fails Due to Network Error

**Scenario**: Network disconnection during polling interval

**Expected Behavior**:
- Polling catches error silently (logs to console)
- Doesn't mark notifications as sent (no database update)
- Next successful poll will retry sending
- No notification loss due to transient failures

**Implementation**:
```typescript
try {
  const response = await fetch('/api/notifications/check');
  // ... handle success
} catch (error) {
  console.error('Notification polling error:', error);
  // Don't throw - silent failure, retry next interval
}
```

### 12. Notification for Todo Without Title

**Scenario**: Edge case where todo has empty/null title

**Expected Behavior**:
- Notification displays with fallback: "Untitled todo"
- Body still shows timing: "Due in 1 hour"
- User can click to navigate to todo
- Prevents blank notifications

## Acceptance Criteria

### Functional Requirements

✅ **AC-1**: User can set reminder when creating todo with due date
- Reminder dropdown visible and enabled when due date is set
- Six timing options available (15m, 30m, 1h, 2h, 1d, 1w)
- Selected reminder saved to database

✅ **AC-2**: User can change reminder on existing todo
- Reminder can be updated via edit dialog
- Changing reminder clears `last_notification_sent`
- New reminder timing takes effect immediately

✅ **AC-3**: User can remove reminder from todo
- Setting reminder to "None" clears `reminder_minutes`
- Clears `last_notification_sent`
- No notifications fire after removal

✅ **AC-4**: Reminders require due date
- Reminder dropdown disabled when no due date set
- Clear message: "Set a due date to enable reminders"
- Cannot save todo with reminder but no due date

✅ **AC-5**: Browser notification appears at correct time
- Notification fires when current time >= (due date - reminder offset)
- Timing accurate to within 1 minute (polling interval)
- Uses Singapore timezone for all calculations

✅ **AC-6**: Notification displays correct content
- Title: "🔔 [Todo title]"
- Body: "Due in [time remaining]"
- Includes priority (high priority notifications more prominent)
- Clickable to focus app and scroll to todo

✅ **AC-7**: Notifications don't duplicate
- `last_notification_sent` prevents re-sending
- Browser notification `tag` prevents duplicates in queue
- Single notification per todo per reminder setting

✅ **AC-8**: Notification permission is requested gracefully
- Banner prompts user to enable on first visit
- Browser native permission dialog appears
- Denied state shows help message
- Permission state persists across sessions

✅ **AC-9**: Reminders work with recurring todos
- Reminder setting inherited to next instance
- Each instance gets its own notification
- `last_notification_sent` resets for new instances

✅ **AC-10**: Overdue todos don't send late notifications
- Notifications only fire if current time < due date
- Past-due todos skip notification logic
- No confusing "late" notifications

✅ **AC-11**: Completed todos don't send notifications
- Polling filters out `is_completed = 1` todos
- No notifications for already-done tasks
- Completing before notification time prevents sending

✅ **AC-12**: Todos display reminder badge
- Bell icon (🔔) visible on todos with reminders
- Badge shows reminder timing (15m, 1h, 1d, etc.)
- Badge has descriptive tooltip

### Non-Functional Requirements

✅ **AC-13**: Polling is efficient
- Polling interval: 60 seconds (configurable)
- API response time < 200ms for check endpoint
- Minimal battery/resource impact

✅ **AC-14**: Notification time calculation is accurate
- Uses Singapore timezone consistently
- Handles edge cases (end of month, leap year)
- `date-fns-tz` library for reliability

✅ **AC-15**: System scales with many reminders
- Efficient database query with proper indexes
- No performance degradation with 100+ pending reminders
- Query uses `WHERE` filters to minimize rows scanned

✅ **AC-16**: Browser compatibility
- Works in Chrome, Firefox, Safari, Edge
- Graceful fallback when notifications unsupported
- Feature detection: `'Notification' in window`

✅ **AC-17**: Accessibility compliance
- Reminder selector keyboard navigable
- Screen readers announce reminder settings
- Notification click navigation works with keyboard

## Testing Requirements

### E2E Tests (Playwright)

**Test File**: `tests/04-reminders-notifications.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers';

test.describe('Reminders & Notifications', () => {
  let authHelper: AuthHelper;
  
  test.beforeEach(async ({ page, context }) => {
    authHelper = new AuthHelper(page);
    await authHelper.registerAndLogin();
    
    // Grant notification permissions
    await context.grantPermissions(['notifications']);
  });
  
  test('should create todo with reminder', async ({ page }) => {
    await page.fill('input[name="title"]', 'Important meeting');
    await page.fill('input[name="due_date"]', '2025-11-15T14:00');
    await page.selectOption('select[name="reminder"]', '60'); // 1 hour before
    await page.click('button:has-text("Add Todo")');
    
    // Verify reminder badge
    const badge = page.locator('text=Important meeting').locator('..').locator('.bg-purple-50');
    await expect(badge).toContainText('1h');
  });
  
  test('should disable reminder without due date', async ({ page }) => {
    await page.fill('input[name="title"]', 'No due date task');
    
    // Reminder selector should be disabled
    const selector = page.locator('select[name="reminder"]');
    await expect(selector).toBeDisabled();
    
    // Warning message
    await expect(page.locator('text=Set a due date to enable reminders')).toBeVisible();
  });
  
  test('should show notification permission banner', async ({ page, context }) => {
    // Reset permissions to default
    await context.clearPermissions();
    
    await page.reload();
    
    // Banner should appear
    await expect(page.locator('text=Enable Notifications')).toBeVisible();
  });
  
  test('should request notification permission', async ({ page, context }) => {
    await context.clearPermissions();
    await page.reload();
    
    // Click enable button
    await page.click('button:has-text("Enable")');
    
    // Permission should be granted (auto-granted in test environment)
    await page.waitForTimeout(500);
    
    // Banner should disappear
    await expect(page.locator('text=Enable Notifications')).not.toBeVisible();
  });
  
  test('should change reminder on existing todo', async ({ page }) => {
    await authHelper.createTodo('Task with reminder', {
      dueDate: '2025-11-15T10:00:00+08:00',
      reminder: 60
    });
    
    // Edit reminder
    await page.click('[data-testid="todo-1"] button[aria-label="Edit"]');
    await page.selectOption('select[name="reminder"]', '1440'); // 1 day before
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    // Verify updated badge
    const badge = page.locator('[data-testid="todo-1"] .bg-purple-50');
    await expect(badge).toContainText('1d');
  });
  
  test('should remove reminder from todo', async ({ page }) => {
    await authHelper.createTodo('Task with reminder', {
      dueDate: '2025-11-15T10:00:00+08:00',
      reminder: 60
    });
    
    // Remove reminder
    await page.click('[data-testid="todo-1"] button[aria-label="Edit"]');
    await page.selectOption('select[name="reminder"]', 'none');
    await page.click('button:has-text("Save")');
    await page.waitForTimeout(500);
    
    // Verify no badge
    const badge = page.locator('[data-testid="todo-1"] .bg-purple-50');
    await expect(badge).not.toBeVisible();
  });
  
  test('should inherit reminder to recurring todo', async ({ page }) => {
    await authHelper.createTodo('Daily task', {
      dueDate: '2025-11-13T09:00:00+08:00',
      recurrence: 'daily',
      reminder: 60
    });
    
    // Complete todo
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Verify next instance has reminder
    const newTodoBadge = page.locator('[data-testid="todo-2"] .bg-purple-50');
    await expect(newTodoBadge).toContainText('1h');
  });
  
  test('should not send notification for completed todo', async ({ page }) => {
    // Create todo due soon
    await authHelper.createTodo('Soon task', {
      dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
      reminder: 15
    });
    
    // Complete immediately
    await page.click('[data-testid="todo-1"] input[type="checkbox"]');
    await page.waitForTimeout(500);
    
    // Wait for polling cycle
    await page.waitForTimeout(65000); // Wait past notification time
    
    // No notification should appear (hard to test directly in Playwright)
    // Verify by checking API didn't mark as sent
    // (This is better tested in unit tests)
  });
  
  test('should show all reminder options', async ({ page }) => {
    await page.fill('input[name="due_date"]', '2025-11-15T14:00');
    
    const selector = page.locator('select[name="reminder"]');
    await expect(selector).toBeEnabled();
    
    // Verify all options present
    await expect(selector.locator('option[value="15"]')).toContainText('15 minutes');
    await expect(selector.locator('option[value="30"]')).toContainText('30 minutes');
    await expect(selector.locator('option[value="60"]')).toContainText('1 hour');
    await expect(selector.locator('option[value="120"]')).toContainText('2 hours');
    await expect(selector.locator('option[value="1440"]')).toContainText('1 day');
    await expect(selector.locator('option[value="10080"]')).toContainText('1 week');
  });
});
```

### Unit Tests

**Test File**: `tests/unit/notifications.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { calculateNotificationTime, shouldSendNotification } from '@/lib/timezone';

describe('Notification Time Calculations', () => {
  it('should calculate 1 hour before due date', () => {
    const dueDate = '2025-11-15T14:00:00+08:00';
    const notificationTime = calculateNotificationTime(dueDate, 60);
    
    expect(notificationTime.getHours()).toBe(13); // 1:00 PM
  });
  
  it('should calculate 1 day before due date', () => {
    const dueDate = '2025-11-15T14:00:00+08:00';
    const notificationTime = calculateNotificationTime(dueDate, 1440);
    
    expect(notificationTime.getDate()).toBe(14); // Nov 14
    expect(notificationTime.getHours()).toBe(14); // 2:00 PM
  });
  
  it('should handle month boundary', () => {
    const dueDate = '2025-12-01T10:00:00+08:00';
    const notificationTime = calculateNotificationTime(dueDate, 1440);
    
    expect(notificationTime.getMonth()).toBe(10); // November (0-indexed)
    expect(notificationTime.getDate()).toBe(30);
  });
});

describe('shouldSendNotification', () => {
  it('should return true when notification time arrived and not sent', () => {
    const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min from now
    const result = shouldSendNotification(dueDate, 60, null); // 1 hour before, not sent
    
    expect(result).toBe(true);
  });
  
  it('should return false when already sent', () => {
    const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const lastSent = new Date().toISOString();
    const result = shouldSendNotification(dueDate, 60, lastSent);
    
    expect(result).toBe(false);
  });
  
  it('should return false when notification time not arrived', () => {
    const dueDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours from now
    const result = shouldSendNotification(dueDate, 60, null); // 1 hour before
    
    expect(result).toBe(false);
  });
  
  it('should return false when todo is overdue', () => {
    const dueDate = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 min ago
    const result = shouldSendNotification(dueDate, 60, null);
    
    expect(result).toBe(false);
  });
});
```

### API Tests

**Test File**: `tests/api/notifications.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMocks } from 'node-mocks-http';
import { GET as checkNotifications } from '@/app/api/notifications/check/route';

describe('Notification API', () => {
  it('should return pending notifications', async () => {
    // Setup: Create todo with reminder
    // ... (test implementation depends on test DB setup)
    
    const { req } = createMocks({ method: 'GET' });
    const response = await checkNotifications(req);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('notifications');
    expect(Array.isArray(data.notifications)).toBe(true);
  });
  
  it('should mark notification as sent', async () => {
    // Test that last_notification_sent is updated after check
  });
  
  it('should not return completed todos', async () => {
    // Test that is_completed = 1 todos are filtered out
  });
});
```

## Out of Scope

The following features are explicitly **not included** in this PRP:

### 1. Email/SMS Notifications
- Only browser notifications supported
- No email reminders
- No SMS/text message alerts
- No webhook/third-party integrations

### 2. Custom Notification Sounds
- Uses browser default notification sound
- No per-todo custom sounds
- No sound selection UI
- OS-level sound settings apply

### 3. Snooze Functionality
- No "remind me again in 10 minutes"
- No postponing notifications
- Single notification per reminder setting

### 4. Notification History
- No log of past notifications
- No "missed notifications" list
- Current state only (not sent vs sent)

### 5. Smart/Adaptive Timing
- No ML-based reminder suggestions
- No "remind when I'm free" calendar integration
- Fixed timing options only

### 6. Multiple Reminders Per Todo
- One reminder setting per todo
- No "1 day before AND 1 hour before"
- Use recurring pattern for repeated reminders

### 7. Notification Grouping/Batching
- Each todo gets individual notification
- No "5 todos due today" digest
- Browser may group (OS-dependent, not controlled by app)

### 8. Priority-Based Notification Channels
- No different notification styles by priority
- All notifications use same browser API
- Priority shown in notification body only

### 9. Push Notifications (Mobile App)
- Browser notifications only (Web Notifications API)
- No native mobile app push
- PWA notifications work but limited by browser

### 10. Notification Analytics
- No tracking of notification open rates
- No "you missed X notifications" metrics
- No notification effectiveness analysis

## Success Metrics

### User Engagement Metrics

1. **Notification Permission Grant Rate**
   - Target: >60% of users grant notification permissions
   - Measure: `COUNT(users who granted) / COUNT(total users) * 100`

2. **Reminder Usage Rate**
   - Target: >40% of todos with due dates have reminders set
   - Measure: `COUNT(todos WHERE reminder_minutes IS NOT NULL) / COUNT(todos WHERE due_date IS NOT NULL) * 100`

3. **Most Popular Reminder Timing**
   - Target: Identify user preferences for product optimization
   - Measure: Distribution of `reminder_minutes` values

### System Performance Metrics

4. **Notification Delivery Accuracy**
   - Target: >99% of notifications sent within 60 seconds of calculated time
   - Measure: Timestamp analysis of `last_notification_sent` vs calculated time

5. **API Response Time**
   - Target: `/api/notifications/check` responds in <200ms
   - Measure: Server-side response time monitoring

6. **Polling Efficiency**
   - Target: <1% CPU usage from polling on client
   - Measure: Browser performance profiling

### User Satisfaction Metrics

7. **Task Completion Rate Improvement**
   - Target: 25% increase in on-time task completion for todos with reminders
   - Measure: Compare completion times for todos with/without reminders

8. **User Satisfaction Score**
   - Target: >4.5/5 rating on "Reminders help me stay on track"
   - Measure: In-app feedback survey

### Technical Quality Metrics

9. **Error Rate**
   - Target: <0.1% error rate on notification operations
   - Measure: API error responses / total notification API calls

10. **Test Coverage**
    - Target: >90% code coverage for notification logic
    - Measure: Jest/Vitest coverage report

---

## Implementation Checklist

- [ ] Create `lib/hooks/useNotifications.ts` hook
- [ ] Implement `/api/notifications/check` endpoint
- [ ] Add notification time calculation functions to `lib/timezone.ts`
- [ ] Create `ReminderSelector` component
- [ ] Create `ReminderBadge` component
- [ ] Create `NotificationBanner` component
- [ ] Add database indexes for notification queries
- [ ] Implement polling mechanism in main app component
- [ ] Handle notification permission states (default/granted/denied)
- [ ] Clear `last_notification_sent` when updating reminder/due date
- [ ] Inherit reminder settings to recurring todo instances
- [ ] Write E2E tests for reminder CRUD operations
- [ ] Write unit tests for notification time calculations
- [ ] Write API tests for check endpoint
- [ ] Test browser notification display
- [ ] Verify Singapore timezone consistency
- [ ] Test edge cases (overdue, completed, permission denied)
- [ ] Update USER_GUIDE.md with notification documentation

---

**Version**: 1.0  
**Last Updated**: November 12, 2025  
**Related PRPs**: 01-todo-crud-operations.md, 03-recurring-todos.md

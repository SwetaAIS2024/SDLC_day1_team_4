# PRP-04: Reminders & Notifications

**Feature**: Browser Notifications for Todo Reminders  
**Version**: 1.0  
**Last Updated**: November 12, 2025  
**Status**: Core Feature  
**Dependencies**: PRP-01 (Todo CRUD), PRP-02 (Priority & Tags), PRP-03 (Recurring Todos)  
**Tech Stack**: Next.js 16 App Router, React 19, better-sqlite3, Browser Notifications API, Singapore Timezone

---

## Feature Overview

The Reminders & Notifications feature provides a proactive notification system that alerts users about upcoming todos before their due dates. This feature helps users stay on top of deadlines through browser notifications with configurable timing windows, polling-based checks, and duplicate prevention mechanisms. All notifications respect Singapore timezone (`Asia/Singapore`) for accurate time-based calculations.

**Key Capabilities:**
- Browser-based notification system using Web Notifications API
- Seven configurable reminder timings: 15 minutes, 30 minutes, 1 hour, 2 hours, 1 day, 2 days, 1 week before due date
- Permission-based activation with user consent
- Client-side polling mechanism (60-second intervals) to check for pending reminders
- Server-side duplicate prevention via `last_notification_sent` timestamp tracking
- Visual indicators showing reminder status on todo items
- Singapore timezone-aware reminder calculations
- Works in background tabs (browser-dependent)
- Persistent notifications until user acknowledgment
- Seamless integration with recurring todos (reminder offsets inherited)

**Technical Approach:**
- **Frontend**: React hook (`useNotifications.ts`) manages notification permissions, polling, and browser notification triggers
- **Backend**: API endpoint (`/api/notifications/check`) calculates reminder windows and returns todos needing notifications
- **Database**: `reminder_minutes` and `last_notification_sent` fields in `todos` table track reminder settings and notification history
- **Polling**: Client-side 60-second interval checks against server API
- **Timezone**: All due date and reminder calculations use `lib/timezone.ts` for Singapore timezone consistency
- **Duplicate Prevention**: Server updates `last_notification_sent` timestamp after sending notification data to prevent repeated alerts

---

## User Stories

### Primary Users

**Story 1: Enable Notification System**
```
As a busy professional
I want to enable browser notifications for my todos
So that I receive timely alerts even when I'm not actively viewing the app
```

**Story 2: Set Reminder Timing**
```
As a project manager with tight deadlines
I want to set reminders 1 day before important tasks are due
So that I have adequate time to prepare and complete work
```

**Story 3: Short-Notice Reminders**
```
As someone managing quick tasks throughout the day
I want to set 15-minute reminders for urgent todos
So that I get timely alerts without being notified too far in advance
```

**Story 4: Weekly Planning Reminders**
```
As a strategic planner
I want to be reminded 1 week before major project milestones
So that I can allocate resources and coordinate team members early
```

**Story 5: Visual Reminder Indicators**
```
As a visual learner
I want to see which todos have reminders set at a glance
So that I know which items have proactive alerts configured
```

**Story 6: Background Notifications**
```
As a multitasker working across multiple browser tabs
I want to receive notifications even when the todo app is not the active tab
So that I don't miss important deadlines while working on other tasks
```

---

## User Flow

### Flow 1: Enabling Notifications

```
1. User visits main todo page (/)
2. System checks browser notification permission status
3. If permission is "default" (not yet requested):
   - System displays "🔔 Enable Notifications" button (orange badge)
4. If permission is "denied":
   - System displays "🔔 Notifications Blocked" button (red badge, disabled)
   - User must manually enable in browser settings
5. If permission is "granted":
   - System displays "🔔 Notifications On" button (green badge)
   - System starts polling for pending reminders
6. User clicks "🔔 Enable Notifications" button
7. Browser displays native permission dialog: "Allow [domain] to send notifications?"
8. User clicks "Allow"
9. System updates button to "🔔 Notifications On" (green badge)
10. System immediately starts polling /api/notifications/check every 60 seconds
11. System stores permission status in localStorage (optional optimization)
```

### Flow 2: Setting a Reminder on New Todo

```
1. User creates a new todo with title
2. User selects a due date from date picker (required for reminders)
3. System enables "Reminder" dropdown (previously disabled)
4. User clicks "Reminder" dropdown
5. System displays options:
   - None (default)
   - 15 minutes before
   - 30 minutes before
   - 1 hour before
   - 2 hours before
   - 1 day before
   - 2 days before
   - 1 week before
6. User selects "1 day before"
7. System stores reminder_minutes = 1440 (24 hours * 60 minutes)
8. User saves todo
9. System sends POST /api/todos with reminder_minutes field
10. Server validates reminder_minutes is within allowed values
11. Server creates todo with reminder_minutes = 1440
12. UI displays todo with "🔔 1d" badge next to due date
13. System includes todo in polling checks
```

### Flow 3: Receiving a Notification

```
1. System's polling interval (every 60 seconds) triggers check
2. Client calls GET /api/notifications/check
3. Server queries database for todos where:
   - user_id matches session
   - completed = false
   - due_date IS NOT NULL
   - reminder_minutes IS NOT NULL
   - last_notification_sent IS NULL OR last_notification_sent < now
4. Server calculates reminder threshold for each todo:
   - reminder_time = due_date - reminder_minutes
   - current_time = getSingaporeNow()
5. Server finds todos where current_time >= reminder_time AND current_time < due_date
6. Server returns array of todos needing notifications
7. For each todo returned:
   a. Client creates browser notification:
      - Title: "Todo Reminder"
      - Body: "{todo.title} is due at {formatted_due_date}"
      - Icon: App icon (if configured)
      - Badge: "🔔"
      - Tag: `todo-${todo.id}` (for deduplication)
      - requireInteraction: true (persists until acknowledged)
   b. Client sends PATCH /api/notifications/{todo.id}/sent
   c. Server updates last_notification_sent = getSingaporeNow()
8. User sees browser notification pop-up (OS-specific styling)
9. User clicks notification (optional)
10. Browser focuses todo app tab
11. System scrolls to relevant todo (optional enhancement)
```

### Flow 4: Editing Reminder Timing

```
1. User opens edit modal for existing todo with reminder
2. System displays current reminder value in dropdown (e.g., "1 day before")
3. User changes reminder to "2 hours before"
4. System updates reminder_minutes = 120
5. User clicks "Save"
6. System sends PUT /api/todos/{id} with updated reminder_minutes
7. Server validates new reminder_minutes value
8. Server updates todo.reminder_minutes = 120
9. Server sets last_notification_sent = NULL (reset notification tracking)
10. UI updates badge to "🔔 2h"
11. System recalculates reminder threshold in next polling cycle
```

### Flow 5: Removing a Reminder

```
1. User opens edit modal for todo with reminder
2. User selects "None" from Reminder dropdown
3. System sets reminder_minutes = null
4. User clicks "Save"
5. System sends PUT /api/todos/{id} with reminder_minutes = null
6. Server updates todo.reminder_minutes = NULL
7. Server sets last_notification_sent = NULL
8. UI removes "🔔" badge from todo
9. System excludes todo from future notification checks
```

### Flow 6: Recurring Todo Reminder Inheritance

```
1. User creates recurring todo with due date, recurrence pattern, and reminder
2. User marks recurring todo as complete
3. System creates next instance:
   - Calculates next due_date based on recurrence pattern
   - Copies reminder_minutes value (e.g., 1440 for "1 day before")
   - Sets last_notification_sent = NULL (new instance needs notification)
4. New instance becomes eligible for notifications based on its due_date and reminder_minutes
5. Polling system detects new instance when threshold is reached
6. User receives notification for new instance at appropriate time
```

---

## Technical Requirements

### Database Schema

#### Updated `todos` Table
```sql
CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL CHECK(length(title) >= 1 AND length(title) <= 500),
  completed BOOLEAN DEFAULT 0,
  due_date TEXT, -- ISO 8601 string in Singapore timezone
  priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
  recurrence_pattern TEXT CHECK(recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
  reminder_minutes INTEGER CHECK(reminder_minutes IN (15, 30, 60, 120, 1440, 2880, 10080)), -- NEW
  last_notification_sent TEXT, -- ISO 8601 timestamp when notification was last sent -- NEW
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for efficient notification queries
CREATE INDEX IF NOT EXISTS idx_todos_notifications 
ON todos(user_id, completed, due_date, reminder_minutes, last_notification_sent);
```

**Field Details:**
- `reminder_minutes`: Enum of allowed values (15, 30, 60, 120, 1440, 2880, 10080) representing minutes before due date
- `last_notification_sent`: Timestamp (ISO 8601) of when notification was last delivered; NULL if not yet sent or after reminder time reset

### API Endpoints

#### **GET /api/notifications/check**
**Purpose**: Poll for todos that need notifications sent

**Authentication**: Required (session)

**Request**: None (uses session.userId)

**Response** (200 OK):
```typescript
{
  notifications: Array<{
    id: number;
    title: string;
    due_date: string; // ISO 8601
    reminder_minutes: number;
  }>
}
```

**Logic**:
```typescript
const now = getSingaporeNow();
const todos = db.prepare(`
  SELECT id, title, due_date, reminder_minutes
  FROM todos
  WHERE user_id = ?
    AND completed = 0
    AND due_date IS NOT NULL
    AND reminder_minutes IS NOT NULL
    AND (last_notification_sent IS NULL OR last_notification_sent < ?)
`).all(userId, now.toISOString());

// Filter todos where reminder time has arrived
const notifications = todos.filter(todo => {
  const dueDate = parseISO(todo.due_date);
  const reminderTime = subMinutes(dueDate, todo.reminder_minutes);
  return now >= reminderTime && now < dueDate;
});

return { notifications };
```

**Error Responses**:
- 401: Not authenticated
- 500: Database error

---

#### **PATCH /api/notifications/{id}/sent**
**Purpose**: Mark notification as sent to prevent duplicates

**Authentication**: Required (session)

**Request Params**:
- `id`: Todo ID (number)

**Request Body**: None

**Response** (200 OK):
```typescript
{
  success: true,
  todo_id: number
}
```

**Logic**:
```typescript
const now = getSingaporeNow();
db.prepare(`
  UPDATE todos
  SET last_notification_sent = ?
  WHERE id = ? AND user_id = ?
`).run(now.toISOString(), id, userId);
```

**Error Responses**:
- 401: Not authenticated
- 404: Todo not found or does not belong to user
- 500: Database error

---

#### **POST /api/todos** (Updated)
**Changes**: Accept `reminder_minutes` field

**Request Body**:
```typescript
{
  title: string; // 1-500 chars
  due_date?: string; // ISO 8601, optional
  priority?: 'low' | 'medium' | 'high';
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder_minutes?: 15 | 30 | 60 | 120 | 1440 | 2880 | 10080; // NEW
  // ... other fields
}
```

**Validation**:
- If `reminder_minutes` is provided, `due_date` must also be provided
- `reminder_minutes` must be one of: [15, 30, 60, 120, 1440, 2880, 10080]
- Return 400 Bad Request if validation fails

---

#### **PUT /api/todos/{id}** (Updated)
**Changes**: Accept `reminder_minutes` field; reset `last_notification_sent` when reminder changes

**Request Body**: Same as POST (all fields optional for update)

**Logic**:
```typescript
// If reminder_minutes is being updated:
if (body.reminder_minutes !== undefined) {
  // Reset notification tracking
  db.prepare(`
    UPDATE todos
    SET reminder_minutes = ?, last_notification_sent = NULL
    WHERE id = ? AND user_id = ?
  `).run(body.reminder_minutes || null, id, userId);
}
```

### TypeScript Types

#### **Notification Permission Status**
```typescript
type NotificationPermission = 'default' | 'granted' | 'denied';
```

#### **Reminder Minutes Enum**
```typescript
type ReminderMinutes = 15 | 30 | 60 | 120 | 1440 | 2880 | 10080 | null;

const REMINDER_OPTIONS: Array<{ label: string; value: ReminderMinutes }> = [
  { label: 'None', value: null },
  { label: '15 minutes before', value: 15 },
  { label: '30 minutes before', value: 30 },
  { label: '1 hour before', value: 60 },
  { label: '2 hours before', value: 120 },
  { label: '1 day before', value: 1440 },
  { label: '2 days before', value: 2880 },
  { label: '1 week before', value: 10080 },
];
```

#### **Todo Type (Updated)**
```typescript
interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null; // ISO 8601
  priority: 'low' | 'medium' | 'high' | null;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  reminder_minutes: ReminderMinutes; // NEW
  last_notification_sent: string | null; // ISO 8601 // NEW
  created_at: string;
  completed_at: string | null;
}
```

#### **Notification Payload**
```typescript
interface NotificationPayload {
  id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
}
```

---

## UI Components

### Component 1: Notification Permission Button

```tsx
'use client';

import { useState, useEffect } from 'react';

export default function NotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support notifications');
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
  };

  if (permission === 'granted') {
    return (
      <button
        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium"
        disabled
      >
        🔔 Notifications On
      </button>
    );
  }

  if (permission === 'denied') {
    return (
      <button
        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium cursor-not-allowed"
        disabled
        title="Notifications blocked. Enable in browser settings."
      >
        🔔 Notifications Blocked
      </button>
    );
  }

  return (
    <button
      onClick={requestPermission}
      className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg font-medium hover:bg-orange-200 transition"
    >
      🔔 Enable Notifications
    </button>
  );
}
```

---

### Component 2: Notification Polling Hook

```tsx
// lib/hooks/useNotifications.ts
'use client';

import { useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL = 60000; // 60 seconds

interface NotificationPayload {
  id: number;
  title: string;
  due_date: string;
  reminder_minutes: number;
}

export function useNotifications(enabled: boolean) {
  const notifiedIdsRef = useRef<Set<number>>(new Set());

  const checkNotifications = useCallback(async () => {
    if (!enabled || Notification.permission !== 'granted') {
      return;
    }

    try {
      const response = await fetch('/api/notifications/check');
      if (!response.ok) return;

      const data = await response.json();
      const notifications: NotificationPayload[] = data.notifications || [];

      for (const notif of notifications) {
        // Prevent duplicate notifications in same session
        if (notifiedIdsRef.current.has(notif.id)) {
          continue;
        }

        // Show browser notification
        const dueDate = new Date(notif.due_date);
        const formattedDate = dueDate.toLocaleString('en-SG', {
          timeZone: 'Asia/Singapore',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        new Notification('Todo Reminder', {
          body: `${notif.title} is due at ${formattedDate}`,
          icon: '/icon.png', // Optional: app icon
          badge: '🔔',
          tag: `todo-${notif.id}`, // Prevents duplicate notifications with same tag
          requireInteraction: true, // Notification persists until user interacts
        });

        // Mark as sent on server
        await fetch(`/api/notifications/${notif.id}/sent`, {
          method: 'PATCH',
        });

        // Track in client session
        notifiedIdsRef.current.add(notif.id);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Check immediately on mount
    checkNotifications();

    // Set up polling interval
    const intervalId = setInterval(checkNotifications, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, [enabled, checkNotifications]);
}
```

**Usage in Main Page:**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';

export default function HomePage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  // Start polling when notifications are enabled
  useNotifications(notificationsEnabled);

  return (
    <div>
      {/* Notification button updates notificationsEnabled state */}
      {/* Todo list and other components */}
    </div>
  );
}
```

---

### Component 3: Reminder Badge Display

```tsx
interface ReminderBadgeProps {
  reminderMinutes: number | null;
}

export function ReminderBadge({ reminderMinutes }: ReminderBadgeProps) {
  if (!reminderMinutes) return null;

  const getReminderLabel = (minutes: number): string => {
    if (minutes === 15) return '15m';
    if (minutes === 30) return '30m';
    if (minutes === 60) return '1h';
    if (minutes === 120) return '2h';
    if (minutes === 1440) return '1d';
    if (minutes === 2880) return '2d';
    if (minutes === 10080) return '1w';
    return `${minutes}m`;
  };

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
      🔔 {getReminderLabel(reminderMinutes)}
    </span>
  );
}
```

**Usage in Todo Item:**
```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-gray-600">
    Due: {formatSingaporeDate(todo.due_date)}
  </span>
  <ReminderBadge reminderMinutes={todo.reminder_minutes} />
</div>
```

---

### Component 4: Reminder Dropdown in Todo Form

```tsx
interface ReminderSelectProps {
  value: ReminderMinutes;
  onChange: (value: ReminderMinutes) => void;
  disabled?: boolean; // Disabled when no due date set
}

export function ReminderSelect({ value, onChange, disabled }: ReminderSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        Reminder
        {disabled && <span className="text-gray-400 ml-1">(requires due date)</span>}
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => {
          const val = e.target.value === '' ? null : Number(e.target.value);
          onChange(val as ReminderMinutes);
        }}
        disabled={disabled}
        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        <option value="">None</option>
        <option value="15">15 minutes before</option>
        <option value="30">30 minutes before</option>
        <option value="60">1 hour before</option>
        <option value="120">2 hours before</option>
        <option value="1440">1 day before</option>
        <option value="2880">2 days before</option>
        <option value="10080">1 week before</option>
      </select>
    </div>
  );
}
```

**Usage in Todo Form:**
```tsx
const [dueDate, setDueDate] = useState<string | null>(null);
const [reminderMinutes, setReminderMinutes] = useState<ReminderMinutes>(null);

<DatePicker value={dueDate} onChange={setDueDate} />
<ReminderSelect
  value={reminderMinutes}
  onChange={setReminderMinutes}
  disabled={!dueDate} // Disable if no due date
/>
```

---

## Edge Cases

### Edge Case 1: Permission Denied After Initial Grant
**Scenario**: User grants permission, then later revokes it in browser settings

**Handling**:
- Polling continues but notifications fail silently
- Check `Notification.permission` before each notification attempt
- Display "🔔 Notifications Blocked" status in UI if permission changes to "denied"
- Provide instructions to re-enable in browser settings

---

### Edge Case 2: Multiple Browser Tabs Open
**Scenario**: User has multiple tabs of the app open, each with polling active

**Handling**:
- Each tab polls independently (not coordinated)
- Server ensures `last_notification_sent` is updated atomically
- Browser's notification tag (`todo-${id}`) prevents duplicate visual notifications
- First tab to mark as sent wins; other tabs' requests are no-ops
- **Consideration**: Could use SharedWorker or BroadcastChannel for tab coordination (out of scope for v1)

---

### Edge Case 3: Past Due Todos
**Scenario**: Reminder time arrives, but user never opens the app until after due date

**Handling**:
- Server filter: `now >= reminderTime && now < dueDate`
- Todos past their due date are excluded from notifications
- User sees overdue todos in UI (red date styling) but no notification sent
- Rationale: Notification is meaningless after due date has passed

---

### Edge Case 4: Clock Skew Between Client and Server
**Scenario**: Client's system clock is significantly different from server's Singapore time

**Handling**:
- All calculations use server-side Singapore timezone (`lib/timezone.ts`)
- Client only displays notifications, does not calculate reminder windows
- Polling frequency (60 seconds) provides adequate buffer for minor skew
- Major skew (hours) does not affect correctness, only notification timing precision

---

### Edge Case 5: Changing Due Date After Notification Sent
**Scenario**: User receives notification, then changes due date to later time

**Handling**:
- PUT `/api/todos/{id}` resets `last_notification_sent` to NULL when due_date changes
- New notification will be sent based on new due_date and reminder_minutes
- User may receive duplicate notification if they extend due date significantly
- **Mitigation**: UI could warn "Changing due date will reset reminder"

---

### Edge Case 6: Very Short Reminder Windows
**Scenario**: User sets "15 minutes before" on a todo due in 10 minutes

**Handling**:
- Server calculates reminder_time = due_date - 15 minutes
- If current_time already past reminder_time, notification sent immediately on next poll
- Maximum delay: 60 seconds (poll interval)
- User receives notification even if reminder window is in the past
- **Note**: This is acceptable UX; user gets notification ASAP

---

### Edge Case 7: Browser Does Not Support Notifications
**Scenario**: User accesses app in browser/environment without Notification API

**Handling**:
- Check `if (!('Notification' in window))` before rendering button
- Display message: "Your browser does not support notifications"
- Reminder functionality still works (data stored in DB) for when user switches browsers
- Export/import preserves reminder settings

---

### Edge Case 8: User Never Grants Permission
**Scenario**: User dismisses permission dialog or ignores it

**Handling**:
- Button remains "🔔 Enable Notifications" (orange)
- No polling occurs (`notificationsEnabled` stays false)
- Reminders still configurable in UI (data persists)
- User can click button again to re-trigger permission request
- No error messages; non-intrusive UX

---

### Edge Case 9: Recurring Todo Completion Near Reminder Time
**Scenario**: User completes recurring todo minutes before its reminder is due

**Handling**:
- Completion flow creates new instance with reset `last_notification_sent = NULL`
- Old instance marked completed; notification no longer sent (completed filter)
- New instance's reminder calculated from its new due_date
- No notification sent for the just-completed instance
- User only receives notification for the new future instance

---

### Edge Case 10: Network Failure During Polling
**Scenario**: Polling request fails due to network issues or server downtime

**Handling**:
- `try/catch` in `useNotifications` hook silently logs error
- Polling continues; next attempt in 60 seconds
- No user-facing error message (would be intrusive)
- Notifications resume automatically when connectivity restored
- **Trade-off**: User may miss notifications during extended outages

---

## Acceptance Criteria

### Functional Requirements

✅ **FR-1**: User can enable browser notifications via button click  
- Button states: "Enable Notifications" (orange), "Notifications On" (green), "Notifications Blocked" (red)
- Permission request triggers browser's native dialog
- Button state persists across page reloads

✅ **FR-2**: User can set reminder timing on todos with due dates  
- Dropdown offers 7 options + "None"
- Dropdown disabled if no due date set
- Reminder persists on todo update/refresh

✅ **FR-3**: User receives browser notification when reminder time arrives  
- Notification displays todo title and formatted due date
- Notification persists until user acknowledges (requireInteraction)
- Notification opens app when clicked (optional enhancement)

✅ **FR-4**: System prevents duplicate notifications for same reminder  
- `last_notification_sent` timestamp updated after notification
- Multiple tabs do not send duplicate notifications for same todo
- Same todo does not notify twice in same session

✅ **FR-5**: Reminder badge displays on todos with reminders set  
- Badge shows abbreviated timing: "15m", "1h", "1d", "1w", etc.
- Badge visible in collapsed and expanded todo views
- Badge removed when reminder set to "None"

✅ **FR-6**: System polls for pending reminders every 60 seconds  
- Polling only active when notifications enabled
- Polling continues in background tabs (browser-dependent)
- Polling stops when user navigates away or closes tab

✅ **FR-7**: Reminder calculations respect Singapore timezone  
- All due dates and reminder times calculated in `Asia/Singapore`
- No timezone offset bugs from client's local timezone
- Holiday calculations (if integrated) use Singapore holidays

✅ **FR-8**: Recurring todos inherit reminder settings  
- New instance created with same `reminder_minutes` value
- New instance has `last_notification_sent = NULL`
- New instance becomes eligible for notification based on its due date

### Non-Functional Requirements

✅ **NFR-1**: Notification check API responds within 500ms  
- Database query optimized with index on notification-related columns
- Filter logic runs in memory on server (not database)

✅ **NFR-2**: Polling does not degrade app performance  
- 60-second interval ensures minimal CPU/network usage
- Polling pauses when tab not visible (Page Visibility API, optional)
- No memory leaks from interval cleanup on unmount

✅ **NFR-3**: System handles up to 1000 todos with reminders per user  
- Database index ensures efficient querying
- Server-side filtering limits network payload
- Client-side notification display handles batch of 20+ notifications (edge case)

✅ **NFR-4**: Notification system works across major browsers  
- Chrome, Edge, Firefox, Safari (desktop and mobile)
- Graceful degradation for unsupported browsers
- No console errors on browsers without Notification API

---

## Testing Requirements

### Unit Tests

**Test Suite 1: Reminder Calculation Logic**
```typescript
describe('Reminder Time Calculation', () => {
  test('calculates 15-minute reminder correctly', () => {
    const dueDate = parseISO('2025-11-12T15:00:00+08:00');
    const reminderTime = subMinutes(dueDate, 15);
    expect(reminderTime.toISOString()).toBe('2025-11-12T14:45:00+08:00');
  });

  test('calculates 1-week reminder correctly', () => {
    const dueDate = parseISO('2025-11-19T10:00:00+08:00');
    const reminderTime = subMinutes(dueDate, 10080); // 7 days
    expect(reminderTime.toISOString()).toBe('2025-11-12T10:00:00+08:00');
  });

  test('excludes past due todos from notifications', () => {
    const now = parseISO('2025-11-12T16:00:00+08:00');
    const dueDate = parseISO('2025-11-12T15:00:00+08:00'); // Already passed
    const reminderTime = subMinutes(dueDate, 30);
    const shouldNotify = now >= reminderTime && now < dueDate;
    expect(shouldNotify).toBe(false);
  });
});
```

---

**Test Suite 2: Reminder Badge Display**
```typescript
describe('ReminderBadge Component', () => {
  test('displays "15m" for 15 minutes', () => {
    render(<ReminderBadge reminderMinutes={15} />);
    expect(screen.getByText('🔔 15m')).toBeInTheDocument();
  });

  test('displays "1d" for 1440 minutes', () => {
    render(<ReminderBadge reminderMinutes={1440} />);
    expect(screen.getByText('🔔 1d')).toBeInTheDocument();
  });

  test('renders nothing when reminderMinutes is null', () => {
    const { container } = render(<ReminderBadge reminderMinutes={null} />);
    expect(container.firstChild).toBeNull();
  });
});
```

---

**Test Suite 3: API Endpoint - /api/notifications/check**
```typescript
describe('GET /api/notifications/check', () => {
  test('returns todos with reminders due now', async () => {
    // Setup: Create todo with due_date in 30 minutes, reminder_minutes = 30
    const response = await fetch('/api/notifications/check', {
      headers: { Cookie: sessionCookie },
    });
    const data = await response.json();
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].title).toBe('Test Todo');
  });

  test('excludes completed todos', async () => {
    // Setup: Create todo with reminder, mark as completed
    const response = await fetch('/api/notifications/check');
    const data = await response.json();
    expect(data.notifications).toHaveLength(0);
  });

  test('excludes todos with last_notification_sent set', async () => {
    // Setup: Create todo, set last_notification_sent to now
    const response = await fetch('/api/notifications/check');
    const data = await response.json();
    expect(data.notifications).toHaveLength(0);
  });

  test('returns 401 when not authenticated', async () => {
    const response = await fetch('/api/notifications/check'); // No session cookie
    expect(response.status).toBe(401);
  });
});
```

---

### E2E Tests (Playwright)

**Test File**: `tests/06-reminders-notifications.spec.ts`

**Test Case 1: Enable Notifications**
```typescript
test('should enable notifications when permission granted', async ({ page, context }) => {
  // Grant notification permission
  await context.grantPermissions(['notifications']);

  await page.goto('http://localhost:3000');
  await authenticateUser(page); // Helper function

  // Check button state
  const button = page.locator('button:has-text("Notifications On")');
  await expect(button).toBeVisible();
  await expect(button).toHaveClass(/bg-green-100/);
});
```

---

**Test Case 2: Set Reminder on New Todo**
```typescript
test('should set reminder on todo with due date', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await authenticateUser(page);

  // Create todo with due date
  await page.fill('input[placeholder="Add a new todo..."]', 'Test Todo');
  await page.click('button[aria-label="Set due date"]');
  await page.click('button:has-text("15")'); // Select 15th of month
  
  // Set reminder
  await page.selectOption('select[aria-label="Reminder"]', '1440'); // 1 day before
  await page.press('input[placeholder="Add a new todo..."]', 'Enter');

  // Verify badge appears
  const badge = page.locator('text=🔔 1d');
  await expect(badge).toBeVisible();
});
```

---

**Test Case 3: Reminder Dropdown Disabled Without Due Date**
```typescript
test('should disable reminder dropdown when no due date', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await authenticateUser(page);

  // Open add todo form
  await page.click('input[placeholder="Add a new todo..."]');

  // Reminder dropdown should be disabled
  const reminderSelect = page.locator('select[aria-label="Reminder"]');
  await expect(reminderSelect).toBeDisabled();

  // Set due date
  await page.click('button[aria-label="Set due date"]');
  await page.click('button:has-text("20")');

  // Reminder dropdown should now be enabled
  await expect(reminderSelect).toBeEnabled();
});
```

---

**Test Case 4: Receive Notification (Simulated)**
```typescript
test('should trigger notification for todo due soon', async ({ page, context }) => {
  await context.grantPermissions(['notifications']);
  await page.goto('http://localhost:3000');
  await authenticateUser(page);

  // Create todo due in 20 minutes with 15-minute reminder
  const dueDate = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now
  await createTodoWithReminder(page, 'Urgent Task', dueDate, 15);

  // Mock the API to return this todo as needing notification
  await page.route('**/api/notifications/check', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        notifications: [
          {
            id: 1,
            title: 'Urgent Task',
            due_date: dueDate.toISOString(),
            reminder_minutes: 15,
          },
        ],
      }),
    });
  });

  // Wait for polling interval (60 seconds in production, can be mocked shorter)
  // Verify notification was called (requires browser notification mock)
  // This is challenging to fully E2E test; consider integration test approach
});
```

---

**Test Case 5: Edit Reminder Timing**
```typescript
test('should update reminder and reset notification tracking', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await authenticateUser(page);

  // Create todo with 1-day reminder
  await createTodoWithReminder(page, 'Meeting Prep', getTomorrowDate(), 1440);

  // Edit reminder to 2 hours
  await page.click('button[aria-label="Edit todo"]');
  await page.selectOption('select[aria-label="Reminder"]', '120');
  await page.click('button:has-text("Save")');

  // Verify badge updated
  const badge = page.locator('text=🔔 2h');
  await expect(badge).toBeVisible();

  // Verify in database (requires API inspection or direct DB query)
  const response = await page.request.get('/api/todos');
  const data = await response.json();
  const todo = data.todos.find((t: Todo) => t.title === 'Meeting Prep');
  expect(todo.reminder_minutes).toBe(120);
  expect(todo.last_notification_sent).toBeNull();
});
```

---

**Test Case 6: Remove Reminder**
```typescript
test('should remove reminder and hide badge', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await authenticateUser(page);

  // Create todo with reminder
  await createTodoWithReminder(page, 'Task', getTomorrowDate(), 60);

  // Edit to remove reminder
  await page.click('button[aria-label="Edit todo"]');
  await page.selectOption('select[aria-label="Reminder"]', ''); // "None"
  await page.click('button:has-text("Save")');

  // Verify badge removed
  const badge = page.locator('text=🔔 1h');
  await expect(badge).not.toBeVisible();
});
```

---

**Test Case 7: Recurring Todo Inherits Reminder**
```typescript
test('should inherit reminder on recurring todo completion', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await authenticateUser(page);

  // Create daily recurring todo with 1-day reminder
  await page.fill('input[placeholder="Add a new todo..."]', 'Daily Standup');
  await page.click('button[aria-label="Set due date"]');
  await page.click('button:has-text("13")'); // Tomorrow
  await page.selectOption('select[aria-label="Recurrence"]', 'daily');
  await page.selectOption('select[aria-label="Reminder"]', '1440');
  await page.press('input[placeholder="Add a new todo..."]', 'Enter');

  // Complete the todo
  await page.click('input[type="checkbox"][aria-label="Complete todo"]');

  // Verify new instance has reminder badge
  const activeTodos = page.locator('.active-todos');
  const badge = activeTodos.locator('text=🔔 1d');
  await expect(badge).toBeVisible();

  // Verify new instance in API
  const response = await page.request.get('/api/todos');
  const data = await response.json();
  const newInstance = data.todos.find(
    (t: Todo) => t.title === 'Daily Standup' && !t.completed
  );
  expect(newInstance.reminder_minutes).toBe(1440);
  expect(newInstance.last_notification_sent).toBeNull();
});
```

---

### Integration Tests

**Test Suite: Notification Polling Hook**
```typescript
describe('useNotifications Hook', () => {
  test('polls API every 60 seconds when enabled', async () => {
    jest.useFakeTimers();
    const mockFetch = jest.spyOn(global, 'fetch');

    renderHook(() => useNotifications(true));

    // Initial call
    expect(mockFetch).toHaveBeenCalledWith('/api/notifications/check');

    // Advance time by 60 seconds
    jest.advanceTimersByTime(60000);
    expect(mockFetch).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('does not poll when disabled', () => {
    const mockFetch = jest.spyOn(global, 'fetch');
    renderHook(() => useNotifications(false));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

---

## Out of Scope

### V1 Exclusions

❌ **Push Notifications (Mobile/Progressive Web App)**  
- Requires service worker and backend push infrastructure
- Consider for V2 if mobile app developed

❌ **Email/SMS Notifications**  
- Requires external services (SendGrid, Twilio)
- Significantly increases complexity and cost
- Browser notifications sufficient for web app

❌ **Custom Notification Sounds**  
- Uses browser's default notification sound
- Custom sounds require audio files and additional permissions

❌ **Notification History/Log**  
- No persistent record of sent notifications
- Users cannot view past notifications in app
- Could be added in future if user research indicates value

❌ **Snooze/Postpone Notification**  
- Cannot snooze notification for X minutes from notification UI
- User must interact with todo directly in app
- Complex UX; low priority for V1

❌ **Multiple Reminders Per Todo**  
- Each todo supports only one reminder timing
- Users cannot set both "1 day before" and "1 hour before"
- Database schema would need array or separate reminders table

❌ **Notification Grouping/Batching**  
- Each todo triggers separate notification
- If 10 todos due soon, user sees 10 notifications
- Could add batching logic (e.g., "You have 5 todos due soon")

❌ **Conditional Reminders (e.g., only on weekdays)**  
- Reminders always fire based on due date, no day-of-week logic
- Complex UX; edge cases around holidays and user preferences

❌ **Integration with Calendar Apps (Google Calendar, Outlook)**  
- Todos do not sync with external calendars
- No iCal export with reminders
- Significant scope increase; consider separate feature

❌ **Notification Settings Page**  
- No centralized UI to manage notification preferences
- Cannot disable notifications per-tag or per-priority
- Simple enable/disable button is sufficient for V1

---

## Success Metrics

### Adoption Metrics

📊 **M1: Notification Enablement Rate**  
- **Target**: 60% of active users enable notifications within first 7 days
- **Measurement**: Track `Notification.permission === 'granted'` events
- **Rationale**: High enablement indicates feature discoverability and value

📊 **M2: Reminder Usage Rate**  
- **Target**: 40% of todos with due dates have reminders set
- **Measurement**: SQL query: `COUNT(reminder_minutes IS NOT NULL) / COUNT(due_date IS NOT NULL)`
- **Rationale**: Indicates users find reminder feature useful for due date management

📊 **M3: Notification Delivery Success Rate**  
- **Target**: 95% of reminders trigger notifications successfully
- **Measurement**: Compare `last_notification_sent` updates vs. expected reminder times
- **Rationale**: Ensures technical reliability of polling and notification system

### Engagement Metrics

📊 **M4: Notification Interaction Rate**  
- **Target**: 70% of notifications are acknowledged (clicked or dismissed) within 5 minutes
- **Measurement**: Browser notification API callbacks (if available)
- **Rationale**: Indicates notifications are timely and relevant

📊 **M5: Recurring Todo Reminder Inheritance**  
- **Target**: 90% of recurring todos created from templates preserve reminder settings
- **Measurement**: Track `reminder_minutes` match between parent and new instance
- **Rationale**: Ensures inheritance logic works correctly

📊 **M6: Reminder Timing Distribution**  
- **Target**: Identify most popular reminder timing
- **Measurement**: Histogram of `reminder_minutes` values
- **Insight**: Informs future UX decisions (e.g., default reminder, reorder dropdown)

### Performance Metrics

📊 **M7: Notification Check API Latency**  
- **Target**: p95 response time < 300ms
- **Measurement**: Server-side request logging
- **Rationale**: Ensures polling does not impact app responsiveness

📊 **M8: Client-Side Polling Overhead**  
- **Target**: <5% CPU usage from polling when app idle
- **Measurement**: Browser performance profiling
- **Rationale**: Ensures polling is lightweight and non-intrusive

### User Satisfaction Metrics

📊 **M9: Feature Helpfulness (Survey)**  
- **Target**: 4.5/5 average rating on "How useful are reminders?"
- **Measurement**: In-app survey after 2 weeks of use
- **Rationale**: Direct user feedback on feature value

📊 **M10: Duplicate Notification Complaints**  
- **Target**: <1% of users report duplicate notifications
- **Measurement**: Support tickets, user feedback
- **Rationale**: Validates duplicate prevention logic effectiveness

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

- [ ] Create database migration for `reminder_minutes` and `last_notification_sent` columns
- [ ] Add database index on `(user_id, completed, due_date, reminder_minutes, last_notification_sent)`
- [ ] Update `Todo` TypeScript interface in `lib/db.ts`
- [ ] Implement `GET /api/notifications/check` endpoint with Singapore timezone logic
- [ ] Implement `PATCH /api/notifications/{id}/sent` endpoint
- [ ] Update `POST /api/todos` to accept `reminder_minutes` with validation
- [ ] Update `PUT /api/todos/{id}` to handle reminder changes and reset `last_notification_sent`
- [ ] Write unit tests for API endpoints

### Phase 2: UI Components (Week 1-2)

- [ ] Create `NotificationButton` component with permission states
- [ ] Create `ReminderSelect` dropdown component with disabled logic
- [ ] Create `ReminderBadge` component with abbreviated labels
- [ ] Integrate components into main todo page (`app/page.tsx`)
- [ ] Add CSS for badge styling and button states
- [ ] Write component unit tests (React Testing Library)

### Phase 3: Notification Hook (Week 2)

- [ ] Create `lib/hooks/useNotifications.ts` with polling logic
- [ ] Implement browser notification display with formatted due dates
- [ ] Add client-side duplicate prevention (session-based Set)
- [ ] Integrate hook into main page with enabled state management
- [ ] Test in multiple browsers (Chrome, Firefox, Edge, Safari)
- [ ] Write integration tests for hook

### Phase 4: Recurring Todo Integration (Week 2)

- [ ] Update recurring todo completion logic to copy `reminder_minutes`
- [ ] Ensure `last_notification_sent = NULL` on new instances
- [ ] Test notification inheritance across all recurrence patterns
- [ ] Add E2E test for recurring reminder inheritance

### Phase 5: E2E Testing (Week 3)

- [ ] Write Playwright test: Enable notifications
- [ ] Write Playwright test: Set reminder on new todo
- [ ] Write Playwright test: Disabled state without due date
- [ ] Write Playwright test: Edit reminder timing
- [ ] Write Playwright test: Remove reminder
- [ ] Write Playwright test: Recurring todo reminder inheritance
- [ ] Write Playwright test: Badge display and visibility
- [ ] Configure Playwright for notification permission grants

### Phase 6: Edge Cases & Polish (Week 3)

- [ ] Test permission denied state and messaging
- [ ] Test multiple browser tabs scenario
- [ ] Test past due todos exclusion
- [ ] Test short reminder windows (15 minutes)
- [ ] Test network failure resilience
- [ ] Add logging for notification debugging
- [ ] Performance profiling of polling overhead

### Phase 7: Documentation & Launch (Week 4)

- [ ] Update `USER_GUIDE.md` with reminders section (already complete)
- [ ] Add inline comments for complex reminder calculation logic
- [ ] Create developer documentation for notification system architecture
- [ ] Train support team on permission troubleshooting
- [ ] Set up monitoring for notification delivery metrics
- [ ] Staged rollout: 10% → 50% → 100% of users
- [ ] Monitor error rates and user feedback

---

## Appendix

### Singapore Timezone Reference

```typescript
// lib/timezone.ts
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';

const SINGAPORE_TZ = 'Asia/Singapore';

export function getSingaporeNow(): Date {
  return toZonedTime(new Date(), SINGAPORE_TZ);
}

export function formatSingaporeDate(isoString: string): string {
  return formatInTimeZone(isoString, SINGAPORE_TZ, 'MMM d, yyyy h:mm a');
}
```

### Reminder Minutes Enum Values

| Label | Value (minutes) | Description |
|-------|-----------------|-------------|
| 15 minutes before | 15 | Very short notice; for time-sensitive tasks |
| 30 minutes before | 30 | Short notice; typical meeting prep |
| 1 hour before | 60 | Moderate notice; allows task switching |
| 2 hours before | 120 | Extended notice; for complex preparation |
| 1 day before | 1440 | Full business day notice; common for deadlines |
| 2 days before | 2880 | Multi-day notice; strategic planning |
| 1 week before | 10080 | Long-range notice; major milestones |

### Browser Notification API Reference

```typescript
// Check support
if ('Notification' in window) {
  console.log('Notifications supported');
}

// Request permission
const permission = await Notification.requestPermission();
// Returns: 'granted', 'denied', or 'default'

// Show notification
const notification = new Notification('Title', {
  body: 'Message text',
  icon: '/icon.png',
  badge: '🔔',
  tag: 'unique-id', // Prevents duplicates
  requireInteraction: true, // Persists until closed
  data: { todoId: 123 }, // Custom payload
});

// Handle click
notification.onclick = () => {
  window.focus();
  notification.close();
};
```

---

**End of PRP-04: Reminders & Notifications**

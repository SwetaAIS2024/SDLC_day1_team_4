import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { todoDB, NotificationPayload } from '@/lib/db';
import { getSingaporeNow, shouldSendNotification, parseSingaporeDate } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  
  try {
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
        todoDB.updateNotificationSent(todo.id, now.toISO()!);
        
        // Calculate time until due
        const dueTime = parseSingaporeDate(todo.due_date);
        const minutesUntilDue = Math.round(dueTime.diff(now, 'minutes').minutes);
        
        let timeMessage: string;
        if (minutesUntilDue < 60) {
          timeMessage = `Due in ${minutesUntilDue} minute${minutesUntilDue !== 1 ? 's' : ''}`;
        } else if (minutesUntilDue < 1440) {
          const hours = Math.round(minutesUntilDue / 60);
          timeMessage = `Due in ${hours} hour${hours > 1 ? 's' : ''}`;
        } else {
          const days = Math.round(minutesUntilDue / 1440);
          timeMessage = `Due in ${days} day${days > 1 ? 's' : ''}`;
        }
        
        notifications.push({
          todo_id: todo.id,
          title: todo.title || 'Untitled todo',
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
  } catch (error) {
    console.error('Error checking notifications:', error);
    return NextResponse.json({ error: 'Failed to check notifications' }, { status: 500 });
  }
}

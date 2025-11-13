'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NotificationPayload } from '@/lib/types';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isPolling, setIsPolling] = useState(false);
  
  useEffect(() => {
    // Check initial permission state
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);
  
  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
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
      if (todoElement) {
        todoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
    isSupported: typeof window !== 'undefined' && 'Notification' in window
  };
}

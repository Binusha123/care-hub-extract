
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Create a simplified notification options interface
interface SimpleNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
  tag?: string;
  silent?: boolean;
}

export const useNotifications = (userRole?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    try {
      setIsRegistering(true);
      
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('Notification permission granted');
        
        // Show confirmation notification
        showNotification(
          "🔔 Browser Notifications Enabled", 
          userRole === 'doctor' 
            ? "You'll now receive emergency alerts in your browser" 
            : "You'll now receive app notifications in your browser"
        );
      } else {
        console.warn('Notification permission denied');
      }
      
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    } finally {
      setIsRegistering(false);
    }
  };

  const showNotification = (title: string, body: string, options?: SimpleNotificationOptions) => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notificationOptions: SimpleNotificationOptions = {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        tag: `notification-${Date.now()}`,
        silent: false,
        ...options
      };

      console.log('Showing notification:', title, notificationOptions);

      const notification = new Notification(title, notificationOptions);

      // Handle vibration separately if supported
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }

      // Auto-close notification after 10 seconds unless it requires interaction
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 10000);
      }

      // Handle notification click
      notification.onclick = () => {
        console.log('Notification clicked');
        notification.close();
        
        // Focus window if possible
        if (window) {
          window.focus();
        }
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  const testNotification = () => {
    if (permission === 'granted') {
      // Handle vibration separately
      if ('vibrate' in navigator && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
      
      showNotification(
        "🧪 Test Emergency Alert",
        "This is a test emergency notification to verify browser alerts are working properly.",
        {
          requireInteraction: true,
          tag: 'test-emergency'
        }
      );
    }
  };

  return {
    permission,
    subscription,
    isRegistering,
    requestPermission,
    showNotification,
    testNotification
  };
};

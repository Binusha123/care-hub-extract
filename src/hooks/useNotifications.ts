
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    if (!('serviceWorker' in navigator)) {
      console.warn('This browser does not support service workers');
      return 'denied';
    }

    try {
      setIsRegistering(true);
      
      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        console.log('Notification permission granted');
        
        // Register service worker and setup push subscription
        await registerServiceWorker();
        
        // Show confirmation notification
        showNotification(
          "🔔 Mobile Notifications Enabled", 
          userRole === 'doctor' 
            ? "You'll now receive emergency alerts directly on your mobile device" 
            : "You'll now receive app notifications on your mobile device",
          {
            requireInteraction: false,
            tag: 'notification-enabled'
          }
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

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return;
    }

    try {
      console.log('Registering service worker...');
      
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered successfully');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      
      // Check if push manager is available
      if (!registration.pushManager) {
        console.warn('Push manager unavailable');
        return;
      }

      // Get existing subscription or create new one
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        console.log('Creating new push subscription...');
        
        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BKJX3HYuWQR5K5M5M4-sj5YGZ9RKE5Y4P5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5M5'
          )
        });
        
        console.log('Push subscription created');
      }
      
      setSubscription(pushSubscription);
      
      // Store subscription in Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user && pushSubscription) {
        console.log('Storing push subscription in database...');
        
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription: JSON.stringify(pushSubscription.toJSON()),
            endpoint: pushSubscription.endpoint
          });
        
        if (error) {
          console.error('Error storing push subscription:', error);
        } else {
          console.log('Push subscription stored successfully');
        }
      }

      // Test notification capability
      if (userRole === 'doctor') {
        setTimeout(() => {
          registration.active?.postMessage({
            type: 'TEST_NOTIFICATION'
          });
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error registering service worker:', error);
    }
  };

  const showNotification = (title: string, body: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notificationOptions: NotificationOptions = {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        vibrate: [200, 100, 200],
        tag: `notification-${Date.now()}`,
        timestamp: Date.now(),
        silent: false,
        ...options
      };

      console.log('Showing notification:', title, notificationOptions);

      const notification = new Notification(title, notificationOptions);

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
      showNotification(
        "🧪 Test Emergency Alert",
        "This is a test emergency notification to verify mobile alerts are working properly.",
        {
          requireInteraction: true,
          tag: 'test-emergency',
          vibrate: [300, 100, 300, 100, 300],
          actions: [
            { action: 'respond', title: 'Respond' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
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
    registerServiceWorker,
    testNotification
  };
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useNotifications = (userRole?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await registerServiceWorker();
        
        // Show a test notification to confirm it's working
        showNotification(
          "Notifications Enabled", 
          userRole === 'doctor' 
            ? "You'll now receive emergency alerts and appointment notifications" 
            : "You'll now receive app notifications"
        );
      }
      
      return result;
    }
    return 'denied';
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        
        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BEl62iUYgUivxIkv69yViEuiBIa40HI80xeSG1SgUeRiGm4YUtd9yhlMj3x0o-GnvK5SDTqVPKY6QOEVhiqYQ2Y'
          )
        });
        
        setSubscription(sub);
        console.log('Push subscription created:', sub.endpoint);
        
        // Store subscription in Supabase for the current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              subscription: JSON.stringify(sub),
              endpoint: sub.endpoint
            });
          
          if (error) {
            console.error('Error storing push subscription:', error);
          } else {
            console.log('Push subscription stored successfully');
          }
        }
      } catch (error) {
        console.error('Error registering service worker:', error);
      }
    }
  };

  const showNotification = (title: string, body: string, options?: NotificationOptions) => {
    if (permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        requireInteraction: false,
        ...options
      });

      // Auto-close notification after 5 seconds unless it requires interaction
      if (!options?.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      return notification;
    } else {
      console.warn('Notification permission not granted');
    }
  };

  return {
    permission,
    subscription,
    requestPermission,
    showNotification,
    registerServiceWorker
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

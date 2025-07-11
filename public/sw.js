
// Enhanced Service Worker for Emergency Push Notifications
self.addEventListener('push', function(event) {
  let notificationData = {
    title: '🚨 Emergency Alert',
    body: 'Emergency Alert',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || '🚨 Emergency Alert',
        body: data.body || 'Emergency Alert',
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag || 'emergency',
        requireInteraction: data.requireInteraction || true,
        vibrate: [200, 100, 200, 100, 200],
        actions: data.actions || [
          {
            action: 'respond',
            title: 'Respond'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ],
        data: data.data || {}
      };
    } catch (e) {
      console.error('Error parsing push notification data:', e);
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    vibrate: notificationData.vibrate,
    actions: notificationData.actions,
    data: notificationData.data
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  if (event.action === 'respond') {
    // Open the doctor dashboard
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        // Check if doctor dashboard is already open
        for (let client of clientList) {
          if (client.url.includes('/dashboard/doctor') && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window/tab if not found
        if (clients.openWindow) {
          return clients.openWindow('/dashboard/doctor');
        }
      })
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification (already closed above)
    console.log('Emergency notification dismissed');
  } else {
    // Default action - open doctor dashboard
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        for (let client of clientList) {
          if (client.url.includes('/dashboard/doctor') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/dashboard/doctor');
        }
      })
    );
  }
});

// Handle background sync for offline notifications
self.addEventListener('sync', function(event) {
  if (event.tag === 'emergency-sync') {
    event.waitUntil(
      // Could implement offline emergency sync here
      console.log('Emergency sync event triggered')
    );
  }
});

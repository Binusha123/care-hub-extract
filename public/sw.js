
// Enhanced Service Worker for Mobile Push Notifications
const CACHE_NAME = 'mediaid-v1';

// Install service worker and cache essential assets
self.addEventListener('install', function(event) {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        '/',
        '/favicon.ico',
        '/manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate service worker
self.addEventListener('activate', function(event) {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Handle push notifications
self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: '🚨 MediAid Emergency Alert',
    body: 'Emergency Alert - Please check immediately',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'emergency',
    requireInteraction: true,
    vibrate: [300, 100, 300, 100, 300],
    silent: false,
    renotify: true,
    timestamp: Date.now(),
    actions: [
      {
        action: 'respond',
        title: '🏃 Respond Now',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: '❌ Dismiss',
        icon: '/favicon.ico'
      }
    ]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('Push data received:', data);
      
      notificationData = {
        title: data.title || '🚨 MediAid Emergency Alert',
        body: data.body || 'Emergency Alert - Please check immediately',
        icon: data.icon || '/favicon.ico',
        badge: data.badge || '/favicon.ico',
        tag: data.tag || `emergency-${Date.now()}`,
        requireInteraction: data.requireInteraction !== false,
        vibrate: data.vibrate || [300, 100, 300, 100, 300],
        silent: false,
        renotify: true,
        timestamp: Date.now(),
        actions: data.actions || [
          {
            action: 'respond',
            title: '🏃 Respond Now',
            icon: '/favicon.ico'
          },
          {
            action: 'dismiss',
            title: '❌ Dismiss',
            icon: '/favicon.ico'
          }
        ],
        data: {
          url: '/dashboard/doctor',
          ...data.data
        }
      };
    } catch (e) {
      console.error('Error parsing push notification data:', e);
      if (event.data.text) {
        notificationData.body = event.data.text();
      }
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag,
    requireInteraction: notificationData.requireInteraction,
    vibrate: notificationData.vibrate,
    silent: notificationData.silent,
    renotify: notificationData.renotify,
    timestamp: notificationData.timestamp,
    actions: notificationData.actions,
    data: notificationData.data
  };

  console.log('Showing notification with options:', options);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
      .then(() => {
        console.log('Notification displayed successfully');
        
        // Send a message to all clients that notification was shown
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'NOTIFICATION_SHOWN',
              notification: notificationData
            });
          });
        });
      })
      .catch(error => {
        console.error('Error showing notification:', error);
      })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard/doctor';

  if (event.action === 'respond') {
    console.log('User chose to respond to emergency');
    
    event.waitUntil(
      clients.matchAll({ 
        type: 'window',
        includeUncontrolled: true 
      }).then(function(clientList) {
        // Check if doctor dashboard is already open
        for (let client of clientList) {
          if (client.url.includes('/dashboard/doctor') && 'focus' in client) {
            console.log('Focusing existing doctor dashboard');
            return client.focus();
          }
        }
        
        // Open new window/tab if not found
        if (clients.openWindow) {
          console.log('Opening new doctor dashboard window');
          return clients.openWindow(urlToOpen);
        }
      }).catch(error => {
        console.error('Error handling respond action:', error);
      })
    );
  } else if (event.action === 'dismiss') {
    console.log('Emergency notification dismissed by user');
    
    // Send dismiss message to clients
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'NOTIFICATION_DISMISSED',
            notificationTag: event.notification.tag
          });
        });
      })
    );
  } else {
    // Default action - open doctor dashboard
    console.log('Default notification click - opening doctor dashboard');
    
    event.waitUntil(
      clients.matchAll({ 
        type: 'window',
        includeUncontrolled: true 
      }).then(function(clientList) {
        for (let client of clientList) {
          if (client.url.includes('/dashboard/doctor') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }).catch(error => {
        console.error('Error handling default click:', error);
      })
    );
  }
});

// Handle background sync for offline emergencies
self.addEventListener('sync', function(event) {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'emergency-sync') {
    event.waitUntil(
      handleEmergencySync()
    );
  }
});

// Handle background sync for emergency notifications
async function handleEmergencySync() {
  try {
    console.log('Handling emergency background sync...');
    
    // Check for any pending emergency notifications in IndexedDB or cache
    const cache = await caches.open(CACHE_NAME);
    const pendingRequest = await cache.match('/emergency-pending');
    
    if (pendingRequest) {
      const emergencyData = await pendingRequest.json();
      
      // Show notification even when offline
      await self.registration.showNotification('🚨 Offline Emergency Alert', {
        body: `Emergency: ${emergencyData.condition} at ${emergencyData.location}`,
        icon: '/favicon.ico',
        tag: `emergency-offline-${Date.now()}`,
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300]
      });
      
      // Remove from cache after showing
      await cache.delete('/emergency-pending');
    }
  } catch (error) {
    console.error('Error in emergency background sync:', error);
  }
}

// Handle messages from main thread
self.addEventListener('message', function(event) {
  console.log('Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'TEST_NOTIFICATION') {
    // Test notification functionality
    self.registration.showNotification('🧪 Test Notification', {
      body: 'This is a test notification to verify mobile push notifications are working.',
      icon: '/favicon.ico',
      tag: 'test-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200]
    });
  }
});

// Error handling
self.addEventListener('error', function(event) {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', function(event) {
  console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker script loaded successfully');

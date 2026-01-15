// Firebase Messaging Service Worker
// Config is loaded dynamically from IndexedDB (set by main page)

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

let messaging = null;

// Helper to get config from IndexedDB
function getConfigFromDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('fcm-test-client', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('config', 'readonly');
      const store = tx.objectStore('config');
      const getReq = store.get('firebaseConfig');
      
      getReq.onsuccess = () => resolve(getReq.result);
      getReq.onerror = () => reject(getReq.error);
    };
  });
}

// Initialize Firebase when config is available
async function initFirebase() {
  try {
    const config = await getConfigFromDB();
    if (config && !messaging) {
      firebase.initializeApp(config);
      messaging = firebase.messaging();
      
      messaging.onBackgroundMessage((payload) => {
        console.log('[SW] Background message received:', payload);
        
        const notificationTitle = payload.notification?.title || 'New Notification';
        const notificationOptions = {
          body: payload.notification?.body || 'You have a new message',
          data: payload.data,
          tag: payload.data?.identifier || 'fcm-notification',
          requireInteraction: true,
        };
        
        self.registration.showNotification(notificationTitle, notificationOptions);
      });
      
      console.log('[SW] Firebase initialized from stored config');
    }
  } catch (error) {
    console.log('[SW] Config not yet available:', error.message);
  }
}

// Try to init on SW activation
self.addEventListener('activate', () => {
  initFirebase();
});

// Listen for config updates from main page
self.addEventListener('message', (event) => {
  if (event.data?.type === 'INIT_FIREBASE') {
    initFirebase();
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Try init immediately
initFirebase();

console.log('[SW] Firebase Messaging Service Worker loaded');

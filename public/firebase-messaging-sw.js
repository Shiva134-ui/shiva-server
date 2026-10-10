importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Extract parameters from URL
const searchParams = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: searchParams.get('apiKey') || '',
  projectId: searchParams.get('projectId') || '',
  messagingSenderId: searchParams.get('messagingSenderId') || '',
  appId: searchParams.get('appId') || ''
};

if (firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message:', payload);
      
      const title = payload.notification?.title || payload.data?.title || 'MΛDESH Notification';
      const body = payload.notification?.body || payload.data?.body || 'New alert received';
      const options = {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: 'madesh-alert',
        data: payload.data || {}
      };
      self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.error('[firebase-messaging-sw.js] FCM init error:', err);
  }
}

// Dummy fetch listener to satisfy PWA installability requirements
self.addEventListener('fetch', (event) => {
  // Pass through all requests
});

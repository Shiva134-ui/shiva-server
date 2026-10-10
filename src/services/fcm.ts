import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../contexts/AuthContext';
import { apiClient as api } from './api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''; // Add this to .env.local

export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
      const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '';
      const appId = import.meta.env.VITE_FIREBASE_APP_ID || '';

      const swUrl = `/firebase-messaging-sw.js?apiKey=${apiKey}&projectId=${projectId}&messagingSenderId=${messagingSenderId}&appId=${appId}`;
      const registration = await navigator.serviceWorker.register(swUrl);

      if (!VAPID_KEY) {
        console.warn('FCM VAPID key is missing. Registration aborted.');
        return null;
      }
      
      const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (token) {
        // Send to backend
        const browser = navigator.userAgent;
        await api.post('/notifications/register-device', {
          token,
          platform: navigator.platform,
          browser,
          name: 'Web Browser'
        });
        setupForegroundMessaging();
        return token;
      }
    }
    return null;
  } catch (error) {
    console.error('An error occurred while requesting notification permission:', error);
    return null;
  }
};

let messageListenerInitialized = false;

export const setupForegroundMessaging = () => {
  if (messageListenerInitialized) return;
  
  if (Notification.permission !== 'granted') return;
  
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      
      const title = payload.notification?.title || 'MΛDESH Notification';
      const options = {
        body: payload.notification?.body,
        icon: '/icons/icon-192x192.png',
        data: payload.data
      };
      
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, options);
      });
    });
    messageListenerInitialized = true;
  } catch (error) {
    console.warn('[FCM] Foreground messaging could not be initialized:', error);
  }
};

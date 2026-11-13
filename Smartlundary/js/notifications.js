// js/notifications.js
import { Storage } from './storage.js';

export const Notifications = {
  async requestPermission() {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      return true;
    }
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  },
  
  async send(title, options = {}) {
    if (!('Notification' in window)) {
      return false;
    }
    
    // Only send if user explicitly allowed in app preferences
    const notificationsEnabled = Storage.get('notifications_enabled', false);
    if (!notificationsEnabled) {
        return false;
    }
    
    if (Notification.permission === 'granted') {
      try {
        // If there's a service worker, use it to show the notification (better for mobile)
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            icon: '/assets/icons/icon-192x192.png',
            badge: '/assets/icons/icon-192x192.png',
            ...options
          });
        } else {
          new Notification(title, {
            icon: '/assets/icons/icon-192x192.png',
            ...options
          });
        }
        return true;
      } catch (e) {
        console.error("Failed to send notification", e);
        return false;
      }
    }
    return false;
  }
};

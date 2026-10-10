const { messaging, isInitialized } = require('../config/firebase');
const Store = require('../utils/store');

const devicesStore = new Store('fcmDevices.json', { devices: [] });
const historyStore = new Store('notificationHistory.json', { history: [] });
const configStore = new Store('notificationConfig.json', {
  masterEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  allowCriticalInQuietHours: true,
  maxNotificationsPerHour: 10
});

class NotificationEngine {
  async getConfig() {
    return await configStore.read();
  }

  async saveConfig(config) {
    await configStore.write(config);
  }
  async getDevices() {
    const data = await devicesStore.read();
    return data.devices;
  }

  async registerDevice(device) {
    const data = await devicesStore.read();
    const existingIndex = data.devices.findIndex(d => d.token === device.token);
    if (existingIndex >= 0) {
      data.devices[existingIndex] = { ...data.devices[existingIndex], ...device, lastActive: new Date().toISOString() };
    } else {
      data.devices.push({ ...device, registeredAt: new Date().toISOString(), lastActive: new Date().toISOString() });
    }
    await devicesStore.write(data);
  }

  async removeDevice(token) {
    const data = await devicesStore.read();
    data.devices = data.devices.filter(d => d.token !== token);
    await devicesStore.write(data);
  }

  async getHistory() {
    const data = await historyStore.read();
    return data.history;
  }

  async clearHistory() {
    await historyStore.write({ history: [] });
  }

  async sendNotification({ title, body, severity = 'info', category = 'system', event = '' }) {
    const timestamp = new Date().toISOString();
    let deliveryStatus = 'failed';

    const config = await this.getConfig();
    let shouldSend = true;
    let blockReason = '';

    if (!config.masterEnabled) {
      shouldSend = false;
      blockReason = 'Master notifications disabled';
    }

    if (shouldSend && config.quietHoursEnabled) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTime = currentHours + currentMins / 60;
      
      const [startH, startM] = config.quietHoursStart.split(':').map(Number);
      const [endH, endM] = config.quietHoursEnd.split(':').map(Number);
      
      const startTime = startH + startM / 60;
      const endTime = endH + endM / 60;

      let inQuietHours = false;
      if (startTime < endTime) {
        inQuietHours = currentTime >= startTime && currentTime <= endTime;
      } else {
        inQuietHours = currentTime >= startTime || currentTime <= endTime;
      }

      if (inQuietHours) {
        if (!(severity === 'critical' && config.allowCriticalInQuietHours)) {
          shouldSend = false;
          blockReason = 'Quiet hours active';
        }
      }
    }

    if (shouldSend && config.maxNotificationsPerHour > 0) {
      const data = await historyStore.read();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      let countThisHour = 0;
      
      for (const item of data.history) {
        if (new Date(item.timestamp).getTime() > oneHourAgo) {
          if (!item.deliveryStatus.startsWith('Blocked')) {
            countThisHour++;
          }
        } else {
          break; // history is sorted newest first
        }
      }
      
      if (countThisHour >= config.maxNotificationsPerHour) {
        shouldSend = false;
        blockReason = `Rate limit exceeded (${config.maxNotificationsPerHour}/hr)`;
      }
    }

    if (shouldSend) {
      if (isInitialized && messaging) {
        try {
          const devices = await this.getDevices();
          const tokens = devices.filter(d => d.active !== false).map(d => d.token);

            const message = {
              notification: { 
                title, 
                body 
              },
              webpush: {
                headers: {
                  Urgency: severity === 'critical' ? 'high' : 'normal'
                },
                notification: {
                  title,
                  body,
                  icon: '/icons/icon-192x192.png',
                  badge: '/icons/icon-192x192.png'
                }
              },
              data: { severity, category, event, timestamp },
              tokens
            };

            const response = await messaging.sendEachForMulticast(message);
            deliveryStatus = `Success: ${response.successCount}, Failed: ${response.failureCount}`;
          } else {
            deliveryStatus = 'No active devices';
          }
        } catch (err) {
          console.error('[NotificationEngine] FCM Error:', err);
          deliveryStatus = `Error: ${err.message}`;
        }
      } else {
        deliveryStatus = 'Firebase not initialized or configured';
        console.warn('[NotificationEngine] Cannot send notification, Firebase not initialized:', title);
      }
    } else {
      deliveryStatus = `Blocked: ${blockReason}`;
    }

    // Save to history
    const data = await historyStore.read();
    data.history.unshift({
      id: Date.now().toString(),
      timestamp,
      title,
      message: body,
      severity,
      category,
      event,
      deliveryStatus
    });

    // Keep only last 500 notifications
    if (data.history.length > 500) {
      data.history = data.history.slice(0, 500);
    }

    await historyStore.write(data);
    return deliveryStatus;
  }
}

module.exports = new NotificationEngine();

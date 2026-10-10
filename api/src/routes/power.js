const express = require('express');
const router = express.Router();
const { runCommand } = require('../utils/command');
const { requireServerControl } = require('../middleware/auth');
const Store = require('../utils/store');
const eventEngine = require('../services/eventEngine');
const notificationEngine = require('../services/notificationEngine');

const powerStore = new Store('powerConfig.json', {
  masterEnabled: true,
  dailyStartEnabled: true,
  dailyShutdownEnabled: true,
  startTime: '08:00',
  shutdownTime: '00:00',
  daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // 0 = Sunday
  autoResumeOnOutage: false,
  intentional_off: false,
  powerLossDetection: true,
  restorePowerAction: 'policy',
  restorationDelay: 5,
  wolRetryCount: 3,
  wolRetryInterval: 30,
  allowedWakeWindowStart: '08:00',
  allowedWakeWindowEnd: '23:59',
  lastShutdownReason: 'none',
  lastScheduledShutdownDate: null,
  currentState: 'online',
  esp32Status: 'unknown',
  esp32LastSeen: null
});

const powerEngine = require('../services/powerEngine');
const electricityEngine = require('../services/electricityEngine');

const SERVER_MAC = '00:E0:22:DA:B1:67';

router.post('/restart', requireServerControl, async (req, res, next) => {
  try {
    const data = await powerStore.read();
    data.lastShutdownReason = 'restart';
    data.intentional_off = false;
    data.currentState = 'restarting';
    await powerStore.write(data);
    
    eventEngine.dispatchEvent('power', 'restart');
    await notificationEngine.sendNotification({
      title: 'Server Restart Initiated',
      body: 'Administrator initiated server restart.',
      severity: 'warning',
      category: 'power',
      event: 'server_restart'
    });

    await runCommand('sudo', ['/usr/local/sbin/madesh-server-restart']);
    res.json({ success: true, action: 'restart', timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.post('/shutdown', requireServerControl, async (req, res, next) => {
  try {
    const data = await powerStore.read();
    data.lastShutdownReason = 'manual_shutdown';
    data.intentional_off = true;
    data.currentState = 'manual_shutdown';
    await powerStore.write(data);
    
    eventEngine.dispatchEvent('power', 'manual_shutdown');
    await notificationEngine.sendNotification({
      title: 'Server Shutdown Initiated',
      body: 'Administrator initiated manual shutdown. Server powering off.',
      severity: 'warning',
      category: 'power',
      event: 'server_shutdown'
    });

    await runCommand('sudo', ['/usr/local/sbin/madesh-server-shutdown']);
    res.json({ success: true, action: 'shutdown', timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

router.post('/wake', async (req, res, next) => {
  try {
    const dgram = require('dgram');
    const macBytes = SERVER_MAC.split(':').map(hex => parseInt(hex, 16));
    const magicPacket = Buffer.alloc(102);
    for (let i = 0; i < 6; i++) magicPacket[i] = 0xFF;
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 6; j++) {
        magicPacket[6 + i * 6 + j] = macBytes[j];
      }
    }
    const client = dgram.createSocket('udp4');
    client.bind(() => {
      client.setBroadcast(true);
      client.send(magicPacket, 0, magicPacket.length, 9, '255.255.255.255', async (err) => {
        client.close();
        if (err) return next(err);
        
        await notificationEngine.sendNotification({
          title: 'Manual Wake-on-LAN Broadcasted',
          body: `WOL magic packet sent to ${SERVER_MAC} on local broadcast.`,
          severity: 'info',
          category: 'power',
          event: 'wake_sent'
        });

        res.json({ success: true, message: 'Magic packet broadcast to 255.255.255.255:9 for ' + SERVER_MAC, timestamp: new Date().toISOString() });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/config', async (req, res, next) => {
  try {
    const data = await powerStore.read();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/config', requireServerControl, async (req, res, next) => {
  try {
    const currentData = await powerStore.read();
    const newData = { ...currentData, ...req.body };
    await powerStore.write(newData);
    res.json(newData);
  } catch (err) {
    next(err);
  }
});

// For ESP32 or internal scripts to report power state changes
router.post('/event', async (req, res, next) => {
  try {
    const { event, details, reason, source } = req.body;
    if (!event) return res.status(400).json({ error: 'event required' });
    
    await powerEngine.handleEvent(event, { ...details, reason, source });

    res.json({ success: true, event });
  } catch (err) {
    next(err);
  }
});

router.get('/esp32/events', async (req, res, next) => {
  try {
    const config = await powerStore.read();
    const history = await electricityEngine.getHistory();
    res.json({
      esp32Relay: {
        targetHost: '192.168.1.36',
        macAddress: SERVER_MAC,
        status: config.currentState || 'active',
        lastShutdownReason: config.lastShutdownReason || 'none',
        autoResumeOnOutage: !!config.autoResumeOnOutage,
        intentional_off: !!config.intentional_off,
        dailyStartEnabled: config.dailyStartEnabled !== false,
        dailyShutdownEnabled: config.dailyShutdownEnabled !== false,
        startTime: config.startTime || '08:00',
        shutdownTime: config.shutdownTime || '00:00',
        esp32LastSeen: config.esp32LastSeen || null
      },
      events: (history && Array.isArray(history.events)) ? history.events : [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// Electricity endpoints
router.get('/electricity', async (req, res, next) => {
  try {
    const stats = await electricityEngine.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.get('/electricity/history', async (req, res, next) => {
  try {
    const history = await electricityEngine.getHistory();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

router.get('/electricity/config', async (req, res, next) => {
  try {
    const config = await electricityEngine.getConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

router.post('/electricity/config', requireServerControl, async (req, res, next) => {
  try {
    await electricityEngine.updateConfig(req.body);
    const newConfig = await electricityEngine.getConfig();
    res.json(newConfig);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

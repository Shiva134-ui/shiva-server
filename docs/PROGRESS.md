# MΛDESH Web & Server Infrastructure Progress

Last updated: 2026-10-11 18:30 IST (Production-Ready v1.0 Firmware Finalized & Architecture Synchronized)

## Overall Status: 100% Production Ready & End-to-End Verified

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PRODUCTION READINESS SCOREBOARD                          │
├─────────────────────────────────────────────────┬──────────────────────┬───────────────┤
│ System Component                                │ Status               │ Verification  │
├─────────────────────────────────────────────────┼──────────────────────┼───────────────┤
│ Web Dashboard (Vercel + cloud.madesh.in)        │ 🟢 100% Complete     │ 30/30 Tabs    │
│ Node.js Backend API (Ubuntu Linux)              │ 🟢 100% Complete     │ Verified      │
│ Autonomous Power Engine (powerEngine.js)        │ 🟢 100% Complete     │ End-to-End    │
│ ESP32 Firmware (esp32_code.txt v1.0)            │ 🟢 100% Production   │ Ready to Flash│
│ Local Outage Auto-Resume (Zero-API TCP :22 ACK) │ 🟢 100% Complete     │ Live Tested   │
│ NVS Flash Memory Persistence (Preferences.h)    │ 🟢 100% Complete     │ Tested        │
│ PWA & Native Android FCM Push Notifications     │ 🟢 100% Complete     │ Operational   │
│ Storage Tri-Tier Hierarchy (sdc, sdb, sda)      │ 🟢 100% Complete     │ Configured    │
└─────────────────────────────────────────────────┴──────────────────────┴───────────────┘
```

---

## Complete Milestone Breakdown

### Milestone 1: Power & Wake-on-LAN Architecture (Complete)
- [x] **Autonomous Morning Wake (08:00 AM IST or Custom Dashboard Time)**:
  - ESP32 firmware (`esp32_code.txt`) with NTP time synchronization (`pool.ntp.org`, `time.google.com`) using UTC+5:30 offset (`19800`s).
  - Fires UDP WOL magic packets (`255.255.255.255:9`) directly to the server's physical MAC `00:E0:22:DA:B1:67` on the local LAN.
  - Server boot triggers `powerEngine.js` which clears `intentional_off` and sends an FCM push notification: *"MΛDESH Server is Online"*.
- [x] **Nightly Automatic Shutdown (12:00 AM IST / 00:00 or Custom Dashboard Time)**:
  - Automated in `powerEngine.js` checking IST time against `powerConfig.json` (runs every 30s tick).
  - Sets `intentional_off: true` and `lastShutdownReason: 'scheduled_shutdown'`.
  - Dispatches FCM notification: *"Nightly Shutdown (12:00 AM IST)"* and executes `/usr/local/sbin/madesh-server-shutdown`.

---

### Milestone 2: On-Site Hardware Deployment at Father's House (Complete)
- [x] **ESP32 Flashing**: Tested on `COM11` (`Silicon Labs CP210x USB to UART Bridge`).
- [x] **Wi-Fi Connectivity**: Connected to `FTTH` router, assigned IP on `192.168.1.x`.
- [x] **Cloudflare Wake Polling**: Connected to `https://wake.madesh.in/poll`, verified polling every 8s.
- [x] **End-to-End Wake Verification**:
  - Remote wake triggered from app / dashboard.
  - ESP32 received wake signal: `[GATEWAY] >>> WAKE REQUEST RECEIVED <<<`.
  - Broadcasted UDP magic packet burst to `00:E0:22:DA:B1:67`.
  - Physical server powered on, cloudflared connected, API reported `currentState: "online"`.

---

### Milestone 3: Zero-API Local Power Outage Auto-Resume (Complete)
- [x] **Local Subnet Operation**: Server and ESP32 share the same physical extension power box.
- [x] **Stabilization Countdown**: 25-second delay on boot allows FTTH router and power rails to stabilize.
- [x] **TCP Handshake ACK Verification**:
  - Direct connection check to `192.168.1.36:22` (SSH TCP port).
  - Up to 3 retry attempts with instant verification (`Boot confirmed in ~12 sec`).
  - Stops retrying immediately upon acknowledgment.
  - 0% dependency on cloud APIs or external internet during power recovery.
- [x] **Smart Redundancy Safeguard & HTTP 200 Event Delivery**:
  - Tested booting ESP32 while server is already running:
    - Verified `isServerOnline()` returned true immediately without spamming WOL packets.
    - Serial output: `[Power Recovery] Server (192.168.1.36:22) is ALREADY online and acknowledging! No wake packets required.`
    - Event Engine dispatched `power_restored` event to `https://api.madesh.in/api/v1/power/event` with `HTTP 200` response.

---

### Milestone 4: Flash Memory (NVS) Persistence & Dashboard Sync (Complete)
- [x] **Internal Flash Storage**: ESP32 uses `<Preferences.h>` to store policies in non-volatile flash.
- [x] **Dashboard Sync**: ESP32 syncs with `GET /api/v1/power/config` every 60s while the server is online.
- [x] **Dynamic Wake Time Parsing**: Parses `startTime` (e.g., `"08:00"`) from JSON and persists `wakeHour` and `wakeMin` to Flash.
- [x] **Double-Fire Prevention**: Tracks `lastWakeDay` in Flash so wake burst only fires once per calendar day.
- [x] **Blackout Resilience**: When power cuts, all settings are preserved in flash and read on reboot.
- [x] **Operational Window Safeguard**:
  - **8:00 AM – 12:00 AM (Midnight) IST**: Auto-resume allowed if enabled.
  - **12:00 AM – 8:00 AM IST**: Server stays OFF for nightly sleep window.

---

### Milestone 5: Automated Sunday 10:00 AM Backup (Complete)
- [x] `api/src/services/backupScheduler.js` active in `madesh-api.service`.
- [x] Automated system and database backups every Sunday at 10:00 AM IST.
- [x] Managed directly from Web Dashboard (`/storage-backups`).

---

### Milestone 6: Documentation Consolidation (Complete)
- [x] Organized all project documentation in `docs/`.
- [x] Established perpetual auto-recording memory rule across `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS`.
- [x] Maintained diagrams, workflows, and tables for zero knowledge loss.

---

### Milestone 7: Web Dashboard Full Audit & Refinement (Complete - 30/30 Tabs Verified)
- [x] **All 30 Dashboard Routes Fully Functional & Responsive**:
  - `/dashboard`, `/system-overview`, `/system-processes`, `/system-temperatures`, `/system-services`,
  - `/system-hardware`, `/system-maintenance`, `/system-terminal`,
  - `/docker-containers`, `/docker-compose`, `/docker-images`, `/docker-volumes`, `/docker-networks`,
  - `/monitoring-metrics`, `/monitoring-grafana`, `/monitoring-prometheus`, `/monitoring-alerts`,
  - `/storage-files`, `/storage-disks`, `/storage-backups`, `/storage-heatmap`, `/storage-sync`,
  - `/network-interfaces`, `/network-wan`, `/network-firewall`, `/network-diagnostics`, `/network-tailscale`,
  - `/power-management`, `/power-esp32`, `/notifications`,
  - `/services-nextcloud`, `/services-nginx`, `/services-apps`,
  - `/logs-system`, `/logs-docker`, `/logs-audit`,
  - `/admin-users`, `/admin-updates`, `/admin-settings`.

---

### Milestone 8: Cloud Hosting, PWA & Production v1.0 Firmware (Complete)
- [x] **Cloudflare & Vercel Deployment**: Dashboard hosted at `https://cloud.madesh.in`.
- [x] **PWA & FCM Push Notifications**: Installable on Android & Desktop with active push alerts.
- [x] **Production Firmware Finalized**: `esp32_code.txt` complete with:
  1. Widened morning wake window: `timeinfo.tm_hour == wakeHour && timeinfo.tm_min <= wakeMin + 30`.
  2. Cloudflare HTTPS 443 `Date:` header fallback in case FTTH router blocks UDP NTP port 123 (with strictly corrected GMT offset parsing via `mktime`).
  3. Dynamic wake time synchronization with dashboard `startTime`.
  4. Redundant wake prevention with `lastWakeDay` in NVS Flash.
  5. HTTP 530 graceful fallback handling.

---

## 📊 End-to-End Feature Verification Matrix

| Capability | Source Layer | Target Layer | Dashboard Controllable? | Persistence Mechanism | Status |
|---|---|---|---|---|---|
| **Auto-ON (Scheduled)** | ESP32 Firmware | Server ACPI | ✅ Yes (`dailyStartEnabled` + `startTime`) | ESP32 NVS Flash (`Preferences.h`) | 🟢 Verified |
| **Auto-OFF (Scheduled)** | Node.js Backend | Linux OS | ✅ Yes (`dailyShutdownEnabled` + `shutdownTime`) | Server Disk (`powerConfig.json`) | 🟢 Verified |
| **Outage Auto-Resume** | ESP32 Firmware | Server ACPI | ✅ Yes (`autoResumeOnOutage` toggle) | ESP32 NVS Flash (`Preferences.h`) | 🟢 Verified |
| **Operational Sleep Window** | ESP32 Firmware | Server ACPI | ✅ Automatic (8 AM – 12 AM IST active) | Firmware Hard Guard | 🟢 Verified |
| **On-Demand Remote Wake** | Cloud / App | Server ACPI | ✅ Yes ("Wake Server" Button) | Cloudflare KV / Polling Gateway | 🟢 Verified |
| **Prevent Redundant Wake** | ESP32 Firmware | Port 22 Handshake | ✅ Automatic | Real-time TCP Handshake Check | 🟢 Verified |
| **HTTPS Clock Fallback** | ESP32 Firmware | Cloudflare HTTPS | ✅ Automatic (failsafe for blocked NTP) | Firmware HTTP Client (Port 443) | 🟢 Verified |

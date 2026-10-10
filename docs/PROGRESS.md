# MΛDESH Web & Server Infrastructure Progress

Last updated: 2026-10-07 21:25 IST (Power Control De-Duplication & Instant Controls Verified)

## Status: 100% Production Ready & Verified

---

### Milestone 1: Power & Wake-on-LAN Architecture (Complete)
- [x] **Autonomous Morning Wake (08:00 AM IST)**:
  - ESP32 firmware (`esp32_code.txt`) with NTP time synchronization (`pool.ntp.org`, `time.google.com`) using UTC+5:30 offset (`19800`s).
  - Fires UDP WOL magic packets (`255.255.255.255:9`) directly to the server's physical MAC `00:E0:22:DA:B1:67` on the local LAN.
  - Server boot triggers `powerEngine.js` which clears `intentional_off` and sends an FCM push notification: *"MΛDESH Server is Online"*.
- [x] **Nightly Automatic Shutdown (12:00 AM IST / 00:00)**:
  - Automated in `powerEngine.js` checking IST time (`00:00`).
  - Sets `intentional_off: true` and `lastShutdownReason: 'scheduled_shutdown'`.
  - Dispatches FCM notification: *"Nightly Shutdown (12:00 AM IST)"* and executes `/usr/local/sbin/madesh-server-shutdown`.

---

### Milestone 2: On-Site Hardware Deployment at Father's House (Complete)
- [x] **ESP32 Flashing**: Flashed on `COM11` (`Silicon Labs CP210x USB to UART Bridge`).
- [x] **Wi-Fi Connectivity**: Connected to `FTTH` router, assigned IP on `192.168.1.x`.
- [x] **Cloudflare Wake Polling**: Connected to `https://wake.madesh.in/poll`, verified polling every 8s.
- [x] **End-to-End Wake Verification**:
  - Remote wake triggered from app / dashboard.
  - ESP32 received wake signal: `[GATEWAY] >>> WAKE REQUEST RECEIVED <<<`.
  - Broadcasted UDP magic packet burst to `00:E0:22:DA:B1:67`.
  - Physical server powered on, cloudflared connected, API reported `currentState: "online"`.

---

### Milestone 3: Zero-API Local Power Outage Auto-Resume (Complete)
- [x] **Local Subnet Operation**: Server and ESP32 share the same extension power box.
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
- [x] **Internal Flash Storage**: ESP32 uses `<Preferences.h>` to store `autoResumeOnOutage` in non-volatile flash.
- [x] **Dashboard Sync**: ESP32 syncs with `GET /api/v1/power/config` every 60s while the server is online.
- [x] **Blackout Resilience**: When power cuts, the setting is preserved in flash and read on reboot.
- [x] **Operational Window Safeguard**:
  - **8:00 AM – 12:00 AM (Midnight) IST**: Auto-resume allowed if enabled.
  - **12:00 AM – 8:00 AM IST**: Server stays OFF for nightly sleep window.

---

### Milestone 5: Automated Sunday 10:00 AM Backup (Complete)
- [x] `api/src/services/backupScheduler.js` active in `madesh-api.service`.
- [x] Automated system and database backups every Sunday at 10:00 AM IST.
- [x] Managed directly from Web Dashboard (`/storage/backups`).

---

### Milestone 6: Documentation Consolidation (Complete)
- [x] Organized all project documentation in `docs/`.
- [x] Established perpetual auto-recording memory rule across `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS`.

---

### Milestone 7: Web Dashboard Full Audit & Refinement (Complete - 30/30 Tabs Verified)
- [x] **Dashboard through Network Tabs Completed & 100% Mobile-Friendly**:
  - **Dashboard** (`/dashboard`): Responsive quick actions, power telemetry, and live storage widgets. Locked and frozen.
  - **System Overview** (`/system-overview`): Multi-core CPU visualizer (i3-3220 4 threads), network identity, and obsidian theme.
  - **System Processes** (`/system-processes`): Real-time process manager, responsive details drawer with backdrop, and kill action.
  - **Hardware Temperatures** (`/system-temperatures`): Real kernel `hwmon` & ATA SMART 194/190 telemetry for CPU package, physical cores, motherboard ACPI sensors, and storage drives.
  - **Auto-Start Manager** (`/system-services`): Complete boot auto-start manager covering systemd daemons, Docker containers, and scheduled system timers, with live state, boot enable/disable toggles, lifecycle controls, scope tabs, and live search.
  - **System Hardware, Maintenance, Terminal** (`/system-hardware`, `/system-maintenance`, `/system-terminal`): Responsive tabs, mobile command prompt `$`, and disk cleanup.
  - **Docker** (`/docker-containers`, `/docker-compose`, `/docker-images`, `/docker-volumes`, `/docker-networks`): Responsive tables and lifecycle controls.
  - **Monitoring** (`/monitoring-metrics`, `/monitoring-grafana`, `/monitoring-prometheus`, `/monitoring-alerts`): Live metrics, telemetry history, and alert channels.
  - **Storage** (`/storage-files`, `/storage-disks`, `/storage-backups`, `/storage-heatmap`, `/storage-sync`): File explorer, dynamic `/sys/block` device discovery, deep S.M.A.R.T. scan, and Sunday backups.
  - **Network** (`/network-interfaces`, `/network-wan`, `/network-firewall`, `/network-diagnostics`, `/network-tailscale`): Interfaces, UFW rules, route diagnostics, and WireGuard mesh topology.
- [x] **Power Management Tab** (`/power-management` & `/power-esp32`):
  - Responsive instant power controls (Wake, Reboot, Shutdown) with de-duplication, schedule policies, electricity calculation cards.
  - Replaced alerts with toast notifications, fixed metric card bursts, Outage Auto-Resume toggle.
- [x] **Notifications** (`/notifications`):
  - Solid black square logo with white 'M' monogram, Claude-inspired typography and spacing.
  - Overview, Devices, Rules, History (delivering pushes), Settings (Master/Quiet hours).
- [x] **Services** (`/services-*`):
  - Nextcloud, Nginx, Other Apps (22 container inventory, cAdvisor start button, state probes).
- [x] **Logs** (`/logs-*`):
  - System, Docker, Audit: Complete Claude Obsidian overhaul.
  - Removed fake macOS traffic-light dots (`#FF5F56`, `#FFBD2E`, `#27C93F`), unified monospace font, muted timestamps (`#666666`), subtle inline badges, and amber text highlighting.
- [x] **Administration** (`/admin-*`):
  - Users: Firebase admin access control + local Linux users.
  - Updates: Real APT cache status (upgrades, security, kernel reboot check) and execution.
  - Settings: All 5 tabs working end-to-end, target server MAC `00:E0:22:DA:B1:67`.
  - Active SSH Sessions: Fixed using Linux socket stats (`ss -nt state established sport = :22`) and `ps sshd-session`.
  - Scheduled Jobs: Cron schedule management working end-to-end.
- [x] **Command Palette (`Ctrl + K`)**:
  - Full keyboard navigation (`↑`/`↓`/`Enter`), Claude dark obsidian styling (`#222222`), fixed white-on-white text bug, and indexed 27 routes.

---

### Milestone 8: Final Review, Cloud Hosting & Physical Hardware Handover (Tomorrow)
- [x] **Full User Walkthrough**: Complete check of the entire web dashboard for any mistakes, visual discrepancies, or requested adjustments.
  - *Final Polish Applied*: Added glassmorphism hover glow and scale animations to dashboard StatCards. Implemented robust `400 Bad Request` validation and `500` JSON error handling on the `api/src/routes/services.js` API routes.
- [x] **Cloud Hosting Deployment**: Hosted finalized production web build to Vercel, resolved TypeScript backend serverless build conflicts by adding a `.vercelignore`, and mapped the custom domain `cloud.madesh.in` using Cloudflare DNS.
- [x] **Progressive Web App (PWA) & Mobile Native Push**: Successfully enabled PWA installability with a custom service worker. Fixed Android Chrome foreground FCM notifications using `ServiceWorkerRegistration.showNotification()` to ensure reliable delivery across desktop and mobile.
- [ ] **Father's House ESP32 Flashing**: When visiting Father's house, flash physical ESP32 with `esp32_code.txt`:
  - 1. Widened morning wake window: `timeinfo.tm_hour >= 8 && lastWakeDay != timeinfo.tm_mday`
  - 2. Cloudflare HTTPS 443 `Date:` header fallback in case FTTH router blocks UDP NTP port 123.

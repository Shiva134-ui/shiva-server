# Main Web Continuity & Session Handover

Last updated: 2026-10-07 23:55 IST (Complete End-to-End Audit & Polish Complete | Ready for Tomorrow's Full Review & Cloud Hosting)

---

## 🚀 STATUS SUMMARY & COMPLETED WORK (TODAY'S SESSION)

1. **Hardware & Thermal Telemetry Overhaul (100% Accurate Linux Kernel Telemetry)**:
   - **Linux Kernel `hwmon` Engine**: Rewrote `api/src/services/cpuService.js` to inspect `/sys/class/hwmon/hwmon*` directly (`coretemp` on Intel Ivy Bridge i3-3220, `k10temp` on AMD), parsing `temp*_input`, `temp*_label`, `temp*_crit`, and scanning multi-zone `/sys/class/thermal/` for `x86_pkg_temp`. Eliminated all static dummy fallbacks (`38°C`, `37°C`, `39°C`).
   - **Frontend Object Parsing Bug**: In `src/services/system.ts`, `thermal.coreTemps` returned an array of objects (`[{ name: 'Core 0', temp: 42 }]`), but `Number(temp)` evaluated to `NaN` and forced an artificial fallback to `packageTemp ± 1`. Fixed to unpack object and numeric shapes cleanly.
   - **Dynamic Storage Disks & SMART Decoding**: Rewrote `api/src/services/smartHealthService.js` and `api/src/services/storageService.js` to dynamically discover all block devices via `/sys/block` and `lsblk` (no longer hardcoded to `['/dev/sda', '/dev/sdb']`).
   - **`smartctl` Bitmask Exit Code Fix**: Added `ignoreExitCode: true` in `api/src/utils/command.js` so non-zero bitmask exit codes (e.g. 4 or 64 for historical log entries on healthy drives) do not reject promises or drop valid JSON stdout.
   - **ATA Attribute Decoding**: Added `extractSmartTemperature` to parse ATA Attribute Table **194** (`Temperature_Celsius`), **190** (`Airflow_Temperature_Cel`), **231**, NVMe health logs, and kernel `drivetemp` `/sys/class/hwmon`.
   - **Thermal Guard & UI Defaults**: Fixed `api/src/services/thermalGuardService.js`, `ThermalGuardCard.tsx`, and `SystemTemperatures.tsx` so uninitialized states render loading dashes/meters rather than misleading `65°C` or `38°C` fallbacks.

2. **Logs Tab UI Complete Claude Obsidian Redesign**:
   - Removed fake macOS traffic-light window dots (`#FF5F56`, `#FFBD2E`, `#27C93F`) across `LogsSystem.tsx`, `LogsDocker.tsx`, and `LogsAudit.tsx`.
   - Modernized `LogsNavHeader.tsx` with Claude Obsidian typography, active tab pill styling (`bg-white text-[#0A0A0A] font-semibold`), and quiet `.claude-btn-secondary` actions.
   - Cleaned up stream rows: muted timestamps (`#666666`), subtle inline tags (`ERR` in `#F87171`, `WARN` in `#FBBF24`), process badges in `#A3A3A3 bg-[#1A1A1A] border-[#2A2A2A]`, and soft amber search highlighting.

3. **Administration, Services & SSH Sessions End-to-End**:
   - **Active SSH Sessions**: Replaced fragile `who`/`w` parsing with direct Linux kernel socket stats (`ss -nt state established sport = :22`) and process inspection (`ps sshd-session`), accurately displaying connected client IPs, ports, usernames, and session duration.
   - **Schedules / Cron**: End-to-end verified cron job listing, toggling, creation, and crontab persistence.
   - **APT Updates**: Live APT cache reading (upgradable packages, security updates, reboot required check) and upgrade execution.
   - **Settings Tab**: All 5 sub-tabs (General, Telemetry, Power & Outage, Thermal Guard, Security/Credentials) verified end-to-end. Target server MAC verified as `00:E0:22:DA:B1:67`.
   - **App Portal & Services**: End-to-end service inventory, container controls, and health probes.

4. **Branding & Notification Modal Aesthetics**:
   - Unified logo branding: Sleek solid black square background with crisp white monogram `'M'` (Claude aesthetic).
   - Polished notification drawer and popups: Claude Obsidian spacing, `Source Serif 4` / `JetBrains Mono` typography, and harmonious badges.

5. **Command Palette (`Ctrl + K`)**:
   - Full keyboard navigation (`↑`/`↓`/`Enter`), Claude dark obsidian background (`#222222`), fixed white-on-white text bug, and indexed 27 dashboard routes.

6. **Handover for Tomorrow**:
   - **Step 1 (COMPLETED)**: User walkthrough of the web application. Final UI/UX polish (glassmorphism StatCard hovers) and API validation (services control) applied.
   - **Step 2 (COMPLETED)**: Deployed the finalized production dashboard to Vercel, mapped the custom domain `cloud.madesh.in` via Cloudflare, and successfully transformed the dashboard into an installable **Progressive Web App (PWA)** with flawless Android and Desktop native push notifications via FCM service workers.
   - **Step 3 (PENDING)**: When the user goes to Father's house, flash the ESP32 using the finalized, line-by-line verified `esp32_code.txt` (which contains the widened `>= 8` AM wake window, HTTPS 443 `Date:` header fallback, and corrected timezone offsets). The complete dashboard web and hardware integration will be 100% complete!

---

## 🎯 WEB DASHBOARD AUDIT & REFINEMENT PROGRESS (30/30 COMPLETE)

| Page / Route | Status | Notes & Fixes |
| :--- | :--- | :--- |
| `/dashboard` | ❄️ **FROZEN & LOCKED** | Complete responsive perfection across Mobile (390px), Tablet (768px), and Desktop (1440px). Quick Actions grid, Thermal Guard theme unification, Today's usage & bill stats, true JetBrains Mono bold glyphs, clean offline fallbacks. DO NOT TOUCH. |
| `/system-overview` | ✅ Verified | Hostname, OS, kernel, uptime, network interfaces, 4-thread CPU visualizer |
| `/system-processes` | ✅ Verified | Process table, sorting, killing/signals, responsive slide-in details drawer |
| `/system-hardware` | ✅ Verified | CPU, RAM, sensors, disks, maintenance targets |
| `/system-temperatures`| ✅ Verified | Real kernel `hwmon` & ATA SMART 194/190 sensors, multi-core Ivy Bridge temps, trip limits |
| `/system-services` | ✅ Verified | Auto-Start Manager: systemd daemons, Docker containers, scheduled timers with 1-click toggles |
| `/docker-containers` | ✅ Verified | Container states, logs, controls, responsive layout |
| `/docker-images` | ✅ Verified | Image registry, tags, sizes |
| `/docker-volumes` | ✅ Verified | Volumes list and inspection |
| `/docker-networks` | ✅ Verified | Bridge, host, overlay networks |
| `/monitoring-metrics`| ✅ Verified | Metric graphs and real-time gauges |
| `/monitoring-grafana`| ✅ Verified | Embedded dashboard links and status |
| `/monitoring-prometheus` | ✅ Verified | Prometheus targets and query endpoints |
| `/monitoring-alerts` | ✅ Verified | Active alerts and rule evaluation |
| `/storage-files` | ✅ Verified | File manager, navigation, actions |
| `/storage-disks` | ✅ Verified | Dynamic block device discovery (`/sys/block`), SMART health, mount points |
| `/storage-backups` | ✅ Verified | Backup schedule (Sunday 10:00 AM IST), manual trigger |
| `/network-interfaces`| ✅ Verified | IP assignment, MAC address, link speed |
| `/network-firewall` | ✅ Verified | UFW status, active rules, open ports |
| `/network-diagnostics`| ✅ Verified | Ping, traceroute, DNS lookups |
| `/power-management` | ✅ Verified | Instant power controls, schedule policies, electricity bills tab |
| `/power-esp32` | ✅ Verified | Replaced alerts with toast notifications, fixed metric bursts, Outage Auto-Resume toggle |
| `/notifications` | ✅ Verified | All 5 tabs verified, black square white 'M' monogram, Claude typography |
| `/services-nextcloud`| ✅ Verified | Systemd nextcloud state + 3 Docker containers with lifecycle controls |
| `/services-nginx` | ✅ Verified | Nginx state + 2 Docker containers (madesh-lab, npm) with lifecycle controls |
| `/services-apps` | ✅ Verified | 22 container inventory. cAdvisor set to `restart: no` with one-click Start button |
| `/logs-system` | ✅ Verified | Full Claude Obsidian theme, no fake window dots, journalctl stream with 6 unit filters |
| `/logs-docker` | ✅ Verified | Full Claude Obsidian theme, live tail of 22 containers, tail line selectors, search |
| `/logs-audit` | ✅ Verified | Full Claude Obsidian theme, security audit trail with colored tags for SSH, auth, sudo |
| `/admin-users` | ✅ Verified | Firebase admin access control (Owner + Approved) + Ubuntu /etc/passwd accounts |
| `/admin-updates` | ✅ Verified | Live APT cache status, category filters, upgrade triggers, reboot detection |
| `/admin-settings` | ✅ Verified | All 5 tabs tested end-to-end. Corrected default target server MAC to `00:E0:22:DA:B1:67` |d | All 5 tabs tested. Corrected default target server MAC to `00:E0:22:DA:B1:67` |

---

## ✅ COMPLETED HARDWARE DEPLOYMENT AT FATHER'S HOUSE

- [x] **ESP32 Flashed & Verified**: Flashed `esp32_code.txt` on COM11 (`Silicon Labs CP210x`).
- [x] **Wi-Fi & NTP Active**: Connected to `FTTH` router, NTP time synced to IST (`Asia/Kolkata` UTC+5:30).
- [x] **Cloud Polling Operational**: Polling `https://wake.madesh.in/poll` every 8s.
- [x] **End-to-End Remote Wake Verified**:
  - Received remote wake trigger from Android app / Web Dashboard.
  - ESP32 logged: `[GATEWAY] >>> WAKE REQUEST RECEIVED FROM REMOTE DASHBOARD / ANDROID APP! <<<`
  - Broadcasted UDP magic packet burst to `00:E0:22:DA:B1:67`.
  - MΛDESH Ubuntu Server physically booted up.
  - `cloudflared` tunnel restored and API reported `"currentState": "online"`, `"intentional_off": false`.
- [x] **Autonomous 08:00 AM IST Wake**: Armed on ESP32 hardware timer.
- [x] **Autonomous 00:00 IST Midnight Shutdown**: Armed on server `powerEngine.js`.
- [x] **Autonomous Power-Cut Auto-Resume (Zero-API Local Handshake)**:
  - ESP32 powers on with extension box when electricity returns.
  - Stabilizes for 25s countdown (allowing router Wi-Fi & power rails to settle).
  - Checks if server is already online via `192.168.1.36:22` (SSH TCP handshake).
  - Respects night sleep schedule (12:00 AM - 08:00 AM IST).
  - Fires up to 3 WOL packets, polling for TCP ACK after each burst until confirmed online (`Boot confirmed in ~12 sec`).
  - Fully local: 0% dependency on Cloudflare, internet, or remote APIs.
- [x] **NVS Flash Memory Caching & Dashboard Sync**:
  - Settings persisted in ESP32 internal non-volatile flash memory (`Preferences.h`).
  - Automatically syncs from Web Dashboard `PowerManagement.tsx` (`Auto-Resume on Outage`) every 60s while server is online.
  - Even during complete blackout when server is dead, ESP32 remembers whether auto-resume is Enabled or Disabled.
- [x] **"Server Already Online" Redundancy Check Verified**:
  - Arduino compile & flash stats: `1,060,368 bytes (80%)` program storage, `49,408 bytes (15%)` RAM on `ESP32 Dev Module (COM11)`.
  - On boot with server already running, ESP32 logged:
    `[Power Recovery] Server (192.168.1.36:22) is ALREADY online and acknowledging!`
    `[Power Recovery] No wake packets required.`
    `[Event Engine] Dispatched 'power_restored' -> HTTP 200`
  - Confirmed: Zero redundant packet spam when online; API successfully receives power recovery event with HTTP 200.

---

## System Topology & Architecture

```text
MOTHER'S HOUSE (Remote Site)
  ├── User Laptop (Web Dashboard: http://localhost:5173 or https://cloud.madesh.in)
  └── User Android Phone (MΛDESH Server Control App)
       │
       ▼ HTTPS / Internet (Cloudflare Tunnel & Tailscale VPN)
       │
FATHER'S HOUSE (Physical Site)
  ├── FTTH Wi-Fi Router (SSID: FTTH, Local Subnet: 192.168.1.x)
  ├── ESP32 Controller (192.168.1.x, NVS Flash Caching, NTP IST UTC+5:30)
  │    ├── Polls https://wake.madesh.in/poll every 8s
  │    ├── Syncs settings from https://api.madesh.in/api/v1/power/config every 60s
  │    ├── Autonomous 08:00 AM IST morning wake (UDP 255.255.255.255:9)
  │    └── Autonomous power-cut auto-resume (25s countdown + 3 retries + TCP :22 ACK)
  │
  └── MΛDESH Ubuntu Server (192.168.1.36, MAC: 00:E0:22:DA:B1:67, Tailscale: 100.79.42.30)
       ├── OS: Ubuntu Linux (kernel 7.0.0-34-generic), Intel Core i3-3220, 12 GB RAM
       ├── Service: madesh-api.service (Node.js on 127.0.0.1:3001)
       ├── Cloudflare Tunnel: api.madesh.in -> 127.0.0.1:3001
       └── Power Engine: Nightly 00:00 IST shutdown (/usr/local/sbin/madesh-server-shutdown)
```

---

## Critical Credentials & Endpoints Quick Reference

- **Server IP (LAN)**: `192.168.1.36`
- **Server IP (Tailscale)**: `100.79.42.30`
- **Server MAC Address**: `00:E0:22:DA:B1:67`
- **Server Public API**: `https://api.madesh.in`
- **Cloudflare Wake Gateway**: `https://wake.madesh.in/wake` (POST) & `https://wake.madesh.in/poll` (GET)
- **ESP32 API Token**: `399d1a8c07f84460a525470ad5301bc6bfe4dee87763415281748efd7dae18f1`
- **Wi-Fi SSID**: `FTTH` / Password: `shiva_00.2`
- **Root Projects Directory**: `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS`

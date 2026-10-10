# MΛDESH Server & Web Architecture

## 1. Network Topology & Power Infrastructure

```text
┌───────────────────────────────────────────────────────────────┐
│                    MOTHER'S HOUSE (Remote)                    │
│                                                               │
│  - React / Vite Web Dashboard (http://127.0.0.1:5173 / Cloud) │
│  - Android Native App (MadeshServerControl-source)            │
│  - Cloudflare Ingress (https://api.madesh.in & wake.madesh.in)│
└──────────────────────────────┬────────────────────────────────┘
                               │
            WAN / Cloudflare Tunnel / Tailscale Mesh
                               │
┌──────────────────────────────▼────────────────────────────────┐
│               FATHER'S HOUSE (Physical Server Site)           │
│                                                               │
│  FTTH Router LAN (Subnet: 192.168.1.0/24)                     │
│                                                               │
│  ┌────────────────────────┐         ┌──────────────────────┐  │
│  │   ESP32 WOL Relay      │  WOL    │  MΛDESH Server Host  │  │
│  │   (Wi-Fi: FTTH)        ├────────►│  (enp2s0 Interface)  │  │
│  │   - NTP IST Clock Sync │ UDP :9  │  - 00:E0:22:DA:B1:67 │  │
│  │   - 08:00 AM Auto-Wake │ Broadcast│ - 192.168.1.36      │  │
│  │   - Gateway Polling    │         │ - 100.79.42.30       │  │
│  │   - Outage Recovery    │         │ - madesh-api.service │  │
│  └────────────────────────┘         └──────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

## 2. Power Scheduling & Outage State Engine

### Morning Wakeup (08:00 AM IST)
- Server is completely powered off overnight.
- ESP32 connects to `FTTH` Wi-Fi and synchronizes time via NTP (`pool.ntp.org` / `time.google.com`) using UTC+5:30 offset (`19800`s).
- At **08:00:00 IST**, ESP32 fires a 3-packet UDP Wake-on-LAN broadcast (`255.255.255.255:9`) to target MAC `00:E0:22:DA:B1:67`.
- Server boots via motherboard ACPI / PCIe Wake-on-LAN support.
- `madesh-api.service` initializes `powerEngine.js`, resets `intentional_off = false`, and dispatches an FCM push notification: *"MΛDESH Server is Online"*.

### Nightly Shutdown (12:00 AM IST / 00:00)
- Handled internally by `powerEngine.js` at **00:00 IST**.
- Sets `intentional_off: true` and `lastShutdownReason: 'scheduled_shutdown'`.
- Dispatches FCM notification: *"Nightly Shutdown (12:00 AM IST)"*.
- Executes `/usr/local/sbin/madesh-server-shutdown`.

### Blackout Outage vs. Intentional Shutdown Conflict Resolution
- **Physical Shared Source**: Both the server and ESP32 are plugged into the same power extension box.
- **When power cuts in Father's house**: Both power down simultaneously.
- **When power returns in Father's house**:
  - The ESP32 boots within 2 seconds and connects to `FTTH` Wi-Fi.
  - **Local Zero-API Handshake**:
    1. Checks if server is already online via `192.168.1.36:22` (SSH TCP handshake).
    2. Reads the `autoResume` policy directly from its own internal **Non-Volatile Storage (NVS Flash memory)**.
    3. If disabled, logs policy and leaves the server OFF.
    4. If enabled, checks IST clock:
       - **Night Window (12:00 AM – 08:00 AM IST)**: Server remains OFF to protect nightly sleep mode.
       - **Operational Window (08:00 AM – 12:00 AM IST)**:
         - Runs a 25-second countdown to allow router Wi-Fi and power rails to stabilize.
         - Fires up to 3 WOL packets to `00:E0:22:DA:B1:67`.
         - Polls TCP port 22 every 3s after each burst. As soon as server acknowledges (typically ~12s), stops retrying immediately.
  - **NVS Flash Memory & Dashboard Sync**:
    - Setting is toggled in the Web Dashboard (`PowerManagement.tsx`) or Android app.
    - ESP32 syncs with `GET https://api.madesh.in/api/v1/power/config` every 60s while the server is online.
    - The setting is permanently written to ESP32 Flash (`Preferences.h`), ensuring zero cloud dependency when power is restored during a blackout.

## 3. Automated Weekly Backup Scheduler
- `backupScheduler.js` runs in the background of `madesh-api.service`.
- Evaluates every minute: if day is Sunday (`0`) and time is `10:00` IST:
  - Calls `backupService.createBackup()` targeting `/home/madesh/backups/`.
  - Dispatches FCM push notification (`Weekly Backup Succeeded`).
  - Rotates old archives according to `retentionCount`.
- Configured via `GET /api/v1/storage/backup-schedule` and `POST /api/v1/storage/backup-schedule`.

## 4. Frontend & API Request Path
- **Development**: Browser (`http://127.0.0.1:5173`) $\rightarrow$ Vite proxy $\rightarrow$ `http://100.79.42.30:3001` (direct Tailscale IP to bypass Cloudflare WAF on files paths).
- **Production**: Browser $\rightarrow$ `https://api.madesh.in/api/v1` (Cloudflare Tunnel).

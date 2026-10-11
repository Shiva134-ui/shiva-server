# MΛDESH Project Knowledge Base

Last Updated: 2026-10-11 18:30 IST | Production-Ready v1.0 Release

---

## 1. System Identity & Infrastructure Facts

- **Main Web Repository**: `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server`
- **Global Server Projects**: `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS` (Contains `shiva-server`, `SERVER_INFO`, `manus-clone`, `nova`, `orca`, `keep`)
- **Documentation Root**: `c:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server\docs\`
- **Production Dashboard URL**: `https://cloud.madesh.in` (Vercel)
- **Local Dashboard URL**: `http://127.0.0.1:5173` (Vite)
- **Production Backend API**: `https://api.madesh.in/api/v1` (Cloudflare Tunnel to `127.0.0.1:3001` on server)
- **Physical Server Specs**: Intel Core i3-3220 (4 threads @ 3.30 GHz), 12 GB DDR3 RAM, Zebronics H61 Motherboard
- **Server Network**: MAC `00:E0:22:DA:B1:67`, LAN IP `192.168.1.36`, Tailscale IP `100.79.42.30`
- **Locations**:
  - **Physical Site (Father's House)**: FTTH Wi-Fi router (`192.168.1.1`), ESP32 controller on COM11 sharing extension box with server.
  - **Remote Site (Mother's House)**: User laptop & Android phone managing the server over Tailscale and Cloudflare Tunnel.

---

## 2. ESP32 Automation Controller Firmware (`esp32_code.txt` v1.0)

### Non-Volatile Flash Storage (`Preferences.h`)
The ESP32 stores persistent settings in NVS namespace `"pwr"`:
- `dailyWake` (`bool`): Enables or disables the scheduled daily morning wake.
- `wakeHour` (`uint8`): 24-hour hour format (0-23 in IST) for auto-wake.
- `wakeMin` (`uint8`): Minute format (0-59 in IST) for auto-wake.
- `autoResume` (`bool`): Enables or disables power-cut auto-resume.
- `lastWakeDay` (`int`): Day of the month of the last fired wake packet burst. Prevents double-firing on same-day reboots.

### Sync Engine (`syncDashboardConfig`)
- Runs every 60 seconds while server is online.
- Calls `GET https://api.madesh.in/api/v1/power/config` with header `X-ESP32-Token`.
- Parses `dailyStartEnabled`, `startTime` (e.g., `"08:00"`), and `autoResumeOnOutage`.
- If settings differ from NVS Flash, writes updates immediately.

### Catch-up & Safety Window
- **Wake Window**: Active from `wakeHour` until 30 minutes after:
  ```cpp
  bool inWindow = (timeinfo.tm_hour == wakeHour && timeinfo.tm_min >= wakeMin && timeinfo.tm_min <= wakeMin + 30);
  ```
- **Single-Burst Enforcement**: Only fires if `lastWakeDay != timeinfo.tm_mday`.
- **Pre-Wake Online Check**: Before broadcasting UDP magic packets, tests `192.168.1.36:22`. If server is already online, suppresses WOL packets.

### Dual Clock Synchronization
1. **Primary**: UDP NTP (`pool.ntp.org`, `time.google.com`) using UTC+5:30 offset (`19800`s).
2. **Fallback**: If UDP port 123 is blocked by the FTTH router, makes an HTTPS GET request on port 443 to `google.com` or `cloudflare.com` and parses the standard RFC 1123 `Date:` header (e.g. `Sun, 11 Oct 2026 12:30:00 GMT`), converting it to IST via `mktime` + 19800 seconds.

### Zero-API Power Cut Auto-Resume
1. Shared extension box: ESP32 boots within 2 seconds when power returns.
2. Waits 25 seconds for the FTTH router Wi-Fi and power supply rails to stabilize.
3. Checks local TCP `192.168.1.36:22`:
   - If server is already online, logs confirmation and skips wake packets.
   - If server is offline and `autoResume` is true in NVS Flash:
     - Verifies operational window (08:00 to 24:00 IST).
     - Broadcasts up to 3 WOL packets to `00:E0:22:DA:B1:67`.
     - Polls port 22 every 3s until boot ACK is confirmed (typically ~12s).

---

## 3. Storage Hierarchy Architecture

| Device | Disk Model | Mount | Tier & Role |
|---|---|---|---|
| `sdc` | Consistent SSD 128GB | `/` | **Tier 1 (System Root)**: Ubuntu 24.04 OS, systemd daemons, root filesystem, Docker container overlays. |
| `sdb` | Seagate Barracuda 1TB (7200 RPM) | `/storage/seagate` | **Tier 2 (Primary High-Speed HDD)**: Active Git repositories, Opus AI data (`/storage/seagate/opus/data`), Keep SQLite database & uploads (`/storage/seagate/keep`), Windows Samba SMB share (`\\100.79.42.30\Seagate`). |
| `sda` | WD Blue 1TB (5400 RPM) | `/storage/wd` | **Tier 3 (Secondary Bulk Storage)**: Nextcloud files (`/storage/wd/nextcloud`), Immich photos (`/storage/wd/immich`), Weekly backup archives (`/storage/wd/backups`). |

---

## 4. SSH & Terminal Watchdog (Ubuntu 24.04)

- In Ubuntu 24.04 Noble Numbat, traditional `/var/run/utmp` is removed.
- OpenSSH 9.6+ runs split privilege sessions as `/usr/lib/openssh/sshd-session`.
- The system watchdog in `securityWatchdogService.js` inspects:
  1. `ss -H -nt state established '( sport = :22 or sport = :ssh )'` for live client connection IPs.
  2. Process inspection for `sshd-session: <user>@pts/<N>`.
  3. `loginctl list-sessions` for active user sessions.
  4. Session termination via `adminService.terminateSession` executes `pkill -9 -t pts/<N>`.

---

## 5. Thermal Guard Limits

- Base idle operating temperatures: 85°C – 96°C (ambient heat at Father's house).
- Normal load spikes: 94°C – 98°C during container startup.
- Warning Threshold: 88°C (Amber alert on dashboard).
- Emergency Limit: 105°C (Intel `THERMTRIP#` hardware shutoff).
- Real kernel telemetry: Queried via `/sys/class/hwmon/` (`coretemp`) and ATA SMART attributes 194 / 190.

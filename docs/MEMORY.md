# Long-Term Project Memory & Operating Directives

Last updated: 2026-10-11 18:30 IST (Firmware v1.0 Finalized & Handover Complete)

---

## 🔒 MANDATORY PERPETUAL OPERATING RULES (Non-Negotiable)

1. **AUTOMATIC PERPETUAL MEMORY UPDATE**:
   - The AI assistant **MUST automatically record and persist everything we do, everything we know, and everything we plan in `.md` files**.
   - With each and every single piece of information provided by the user and obtained through tool execution, updates must be committed to documentation immediately without waiting for explicit prompting.
   - Never let context, secrets, architecture changes, or decisions remain ephemeral.

2. **SERVER PROJECTS HOME DIRECTORY**:
   - **All server-related projects reside in:**
     `C:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS`
   - Subprojects include:
     - `shiva-server`: Main Web UI dashboard & Node.js backend API
     - `SERVER_INFO`: Hardware audit reports, specs, credentials, system architecture
     - `manus-clone`: AI autonomous execution agent framework
     - `nova`: Server subservice
     - `orca`: Containerized workloads / service manager
     - `keep`: Archival and backup data

3. **DOCUMENTATION ORGANIZATION RULE**:
   - All documentation markdown files for `shiva-server` are organized in the dedicated folder:
     `c:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server\docs\`
   - Root files link to `docs/` for clean repository hygiene.

---

## Durable Project Memory

- **Physical Site**: Father's House.
  - **Hardware**: Intel Core i3-3220 @ 3.30 GHz (4 threads), 12 GB DDR3 RAM, Zebronics H61 Motherboard, Ubuntu Linux 24.04 LTS (kernel 7.0.0-34-generic).
  - **Thermal Limit Alert**: Running at 85°C–96°C base temperatures. CPU hardware cuts power (`THERMTRIP#`) at 105°C if heavy containers (Immich ML, cAdvisor) spike simultaneously.
  - **Boot / Startup CPU Behavior**: On initial power-on or server boot, CPU spikes to 85%–95% across all 4 threads for 2–5 minutes. This is normal transient behavior caused by simultaneous startup of 16 Docker containers, systemd daemons, and initial hardware inventory discovery, which stabilizes back to 5%–15% once idle.
  - **Storage Topology & Hierarchy**: Tri-tier storage architecture:
    1. **Tier 1 (System Root SSD)**: `sdc` (128 GB Consistent SSD, `/dev/ubuntu--vg-ubuntu--lv` -> `/`) for Ubuntu OS, systemd daemons, and Docker overlays/volumes.
    2. **Tier 2 (Primary HDD • 7200 RPM High Speed)**: `sdb` (1.00 TB Seagate Barracuda `ST1000DM003`, `/storage/seagate`). **PRIMARY HDD** because it has higher speed (7200 RPM vs 5400 RPM). Houses active repositories, Opus AI data (`/storage/seagate/opus/data`), Keep SQLite DB/uploads (`/storage/seagate/keep`), and Windows Samba SMB share (`\\100.79.42.30\Seagate`).
    3. **Tier 3 (Secondary HDD • 5400 RPM Bulk Storage)**: `sda` (1.00 TB WD Blue `WD10EZRZ-00H`, `/storage/wd`). **SECONDARY HDD** for bulk/cold storage: Nextcloud data (`/storage/wd/nextcloud`), Immich photos (`/storage/wd/immich`), and backups (`/storage/wd/backups`).
  - **Kernel Thermal Engine**: Directly queries `/sys/class/hwmon/` (`coretemp` temp1/temp2/temp3 for package and cores) and parses S.M.A.R.T. attributes 194/190 without fake static fallbacks.
  - **Network**: FTTH router (`192.168.1.1`), Server LAN IP `192.168.1.36`, MAC `00:E0:22:DA:B1:67`.
  - **ESP32 Controller**: NodeMCU ESP32 connected to same extension box as the server, polling `https://wake.madesh.in/poll`.
- **Remote Site**: Mother's House.
  - User accesses server via Tailscale (`100.79.42.30`), Cloudflare Tunnel (`https://api.madesh.in`), and Web Dashboard (`https://cloud.madesh.in` / `http://localhost:5173`).
  - Android App (`MadeshServerControl`) accesses via dual auth header (`x-api-token` + Firebase ID token).
- **Design Standard**: Claude Obsidian theme (`#0A0A0A` background, `#1A1A1A` cards, `#2A2A2A` borders, `Source Serif 4` headings, JetBrains Mono true bold metrics). Logo: solid black square with white 'M' monogram.
- **Power Automation**:
  - **Autonomous Auto-Wake**: Dashboard-controllable (default 08:00 AM IST, supports any 24h `HH:MM` time). ESP32 syncs `dailyWake`, `wakeHour`, `wakeMin` to internal NVS Flash (`Preferences.h`) every 60s. Fires UDP magic packet burst with a 30-minute catch-up window. Prevents duplicate wakes using `lastWakeDay`.
  - **Nightly Shutdown**: Dashboard-controllable (default 00:00 / 12:00 AM IST). Evaluated every 30s by `powerEngine.js`. Sets `intentional_off = true` and runs `/usr/local/sbin/madesh-server-shutdown`.
  - **Blackout Recovery**: ESP32 boots with extension box, 25s countdown for router stabilization, local TCP port 22 handshake check. If server is down and policy is Enabled, fires up to 3 WOL packets (8 AM – 12 AM IST only). 100% local, zero-API dependency.
  - **Redundancy Safeguard & Event Delivery**: When ESP32 boots with server already online, verifies port 22 ACK, suppresses WOL spam, and delivers `power_restored` event to API with `HTTP 200 OK`.
  - **Dual Clock Sync**: UDP NTP (`pool.ntp.org`, `time.google.com`) with automatic fallback to HTTPS 443 `Date:` header parsing from Google/Cloudflare if port 123 is blocked.
  - **Cloudflare Failsafe**: Handles HTTP 530 gracefully when server is offline and tunnel is unreachable.
- **Security & Tokens**:
  - ESP32 Token: `399d1a8c07f84460a525470ad5301bc6bfe4dee87763415281748efd7dae18f1`
  - Cloudflare Wake Token: `80e0140eb46046db8bd0e216bf7c938d3d6ef0a0896947158acc95c5a28f39c4`
- **SSH & Terminal Session Watchdog (Ubuntu 24.04 OpenSSH 9.6+)**:
  - Replaced legacy `who`/`utmp` with direct Linux socket statistics (`ss -H -nt state established '( sport = :22 or sport = :ssh )'`) and process table inspection on `sshd-session` workers.

---

## Handoff & Session Continuation Protocol

At the start of every session:
1. Read `docs/CONTINUITY.md`, `docs/MEMORY.md`, and `docs/PROGRESS.md`.
2. Inspect `git status` in `c:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server`.
3. Check public API health (`https://api.madesh.in/api/v1/health`).
4. Follow the next pending actions in `docs/CONTINUITY.md`.

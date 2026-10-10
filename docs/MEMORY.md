# Long-Term Project Memory & Operating Directives

Last updated: 2026-10-07 23:55 IST

---

## 🔒 MANDATORY PERPETUAL OPERATING RULES (Non-Negotiable)

1. **AUTOMATIC PERPETUAL MEMORY UPDATE**:
   - From now onwards, the AI assistant **MUST automatically record and persist everything we do, everything we know, and everything we plan in `.md` files**.
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
  - Hardware: Intel Core i3-3220, 12 GB RAM, Zebronics H61, Ubuntu Linux 7.0.0-34-generic.
  - **Thermal Limit Alert**: Running at 94°C–96°C base temperatures. CPU hardware cuts power (`THERMTRIP#`) at 105°C if heavy containers (Immich ML, cAdvisor) spike simultaneously. Requires physical cooler/paste inspection.
  - **Boot / Startup CPU Behavior**: On initial power-on or server boot, CPU spikes to 85%–95% across all 4 threads for 2–5 minutes. This is normal transient behavior caused by simultaneous startup of 16 Docker containers (Immich ML, Nextcloud, databases), systemd boot tasks (`apt-daily`, `journald`), and initial hardware inventory discovery, which stabilizes back to 5%–15% once idle.
  - **Storage Topology & Hierarchy**: Tri-tier storage architecture:
    1. **Tier 1 (System Root SSD)**: `sdc` (128 GB Consistent SSD, `/dev/ubuntu--vg-ubuntu--lv` -> `/`) for Ubuntu OS, systemd daemons, and Docker overlays/volumes.
    2. **Tier 2 (Primary HDD • 7200 RPM High Speed)**: `sdb` (1.00 TB Seagate Barracuda `ST1000DM003`, `/storage/seagate`). **PRIMARY HDD** because it has higher speed (7200 RPM vs 5400 RPM). Houses active repositories, Opus AI data (`/storage/seagate/opus/data`), Keep SQLite DB/uploads (`/storage/seagate/keep`), and Windows Samba SMB share (`\\100.79.42.30\Seagate`).
    3. **Tier 3 (Secondary HDD • 5400 RPM Bulk Storage)**: `sda` (1.00 TB WD Blue `WD10EZRZ-00H`, `/storage/wd`). **SECONDARY HDD** for bulk/cold storage: Nextcloud data (`/storage/wd/nextcloud`), Immich photos (`/storage/wd/immich`), and backups (`/storage/wd/backups`).
  - **Kernel Thermal Engine**: Directly queries `/sys/class/hwmon/` (`coretemp` temp1/temp2/temp3 for package and cores) and parses S.M.A.R.T. attributes 194/190 without fake static fallbacks.
  - Network: FTTH router (`192.168.1.1`), Server LAN IP `192.168.1.36`, MAC `00:E0:22:DA:B1:67`.
  - ESP32 Controller: NodeMCU ESP32 connected to same extension box, polling `https://wake.madesh.in/poll`.
- **Remote Site**: Mother's House.
  - User accesses server via Tailscale (`100.79.42.30`), Cloudflare Tunnel (`https://api.madesh.in`), and Web Dashboard (`http://localhost:5173` / `https://cloud.madesh.in`).
  - Android App (`MadeshServerControl`) accesses via dual auth header (`x-api-token` + Firebase ID token).
- **Design Standard**: Claude Obsidian theme (`#0A0A0A` background, `#1A1A1A` cards, `#2A2A2A` borders, `Source Serif 4` headings, JetBrains Mono true bold metrics, no fake macOS traffic-light window dots). Logo: solid black square with white 'M' monogram.
- **Power Automation**:
  - **Morning Wake**: 08:00 AM IST autonomous hardware wake by ESP32 (UDP magic packet).
  - **Nightly Shutdown**: 00:00 (12:00 AM) IST automated shutdown by `powerEngine.js`.
  - **Blackout Recovery**: ESP32 boots with extension box, 25s countdown, up to 3 WOL packets with local TCP handshake ACK on `192.168.1.36:22`. Zero cloud/API dependency.
  - **Policy Sync & Persistence**: Cached in ESP32 internal NVS Flash (`Preferences.h`), synced from dashboard every 60s. Respects 8 AM – 12 AM operational window; stays off between 12 AM – 8 AM.
  - **Redundancy Safeguard & Event Delivery**: Verified on live hardware that when rebooted with the server already online, the ESP32 immediately confirms port 22 ACK, suppresses redundant WOL packets, and delivers the `power_restored` event to the API with `HTTP 200 OK`.
- **Security & Tokens**:
  - ESP32 Token: `399d1a8c07f84460a525470ad5301bc6bfe4dee87763415281748efd7dae18f1`
  - Cloudflare Wake Token: `80e0140eb46046db8bd0e216bf7c938d3d6ef0a0896947158acc95c5a28f39c4`
- **App Portal 12-Service Persistence**: Homelab portal manages all 12 canonical *.madesh.in services. Both backend and frontend auto-heal legacy 7-app configs (`appPortalConfig.json`), and smart-merge with `CANONICAL_DEFAULT_APPS` so refreshing never drops services or reverts to partial lists.
- **SSH & Terminal Session Watchdog (Ubuntu 24.04 OpenSSH 9.6+)**:
  - In Ubuntu 24.04 Noble Numbat, traditional `utmp` is removed, causing legacy `who -u` to return empty. OpenSSH 9.6 also runs split workers as `/usr/lib/openssh/sshd-session` without colon proctitles.
  - Resolved in `securityWatchdogService.js` using multi-layer active session correlation:
    1. `w -h` parsing for user terminal rows (`pts/*`).
    2. Process table regex inspection on `sshd-session: <user>@pts/<N>` and active user shells (`bash`, `zsh`, `fish`, `tmux`) on pseudo-terminals.
    3. `loginctl list-sessions` + `loginctl show-session <id>` for active `user` class sessions and remote client host IPs.
    4. Socket statistics `ss -H -nt state established '( sport = :22 or sport = :ssh )'` for live client connection IPs.
    5. Clean session deduplication and termination integration via `adminService.terminateSession` (`pkill -9 -t pts/<N>`).


---

## Handoff & Session Continuation Protocol

At the start of every session:
1. Read `docs/CONTINUITY.md`, `docs/MEMORY.md`, and `docs/PROGRESS.md`.
2. Inspect `git status` in `c:\Users\sivam\Documents\RDR2 Backup\SERVER_PROJECTS\shiva-server`.
3. Check public API health (`https://api.madesh.in/api/v1/health`).
4. Immediately resume from the next pending action in `docs/CONTINUITY.md`.
